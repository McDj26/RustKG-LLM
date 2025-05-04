const puppeteer = require("puppeteer");
const prompts = require("./diff_prompt.js");
const chat = require("../../../utils/LLM/parseReply2Json.js");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const split2DiffChunks = require("../../../utils/diff/splitChunksV3");
const uniqueObjects = require("../../../utils/uniqueObjects.js");
const ExtractProcessor = require("../../../utils/crawler/ExtractProcessor.js");
const processor = new ExtractProcessor(
  require("../../../assets/basicRule.json")
);

const informParent = {
  ready(msg = "ready") {
    process.send({
      code: 0,
      msg,
    });
  },
  warning(msg) {
    process.send({
      code: 1,
      msg: `process ${process.pid}: ${msg}`,
    });
  },
  info(msg) {
    process.send({
      code: 2,
      msg: `process ${process.pid}: ${msg}`,
    });
  },
  error(code, msg) {
    process.send({
      code,
      msg: `process ${process.pid}: ${msg}`,
    });
  },
};

/**
 * @type {puppeteer.Browser | null}
 */
let browser = null;
puppeteer
  .launch()
  .then((b) => {
    browser = b;
    informParent.ready();
  })
  .catch((e) => {
    informParent.error(-1, `process ${process.pid}: ${e.message}`);
    process.exit(1);
  });

process.on("message", async (msg) => {
  const {
    previous_url,
    target_url,
    contextLength,
    windowLength,
    method = "word",
    baseUrl,
    savePath,
    model = process.env.LLM_MODEL,
    max_tokens,
    ...extraInfo
  } = msg;
  const defaultSavePath = `./output/${model}`;

  if (!model) {
    informParent.error(-1, "model not provided");
    informParent.ready();
    return;
  } else if (!previous_url || !target_url) {
    informParent.error("url not provided");
    informParent.ready();
    return;
  } else if (!baseUrl) {
    informParent.error(-1, "base url not provided");
    informParent.ready();
    return;
  } else if (!contextLength || !windowLength) {
    informParent.error(-1, "contextLength or windowLength not provided");
    informParent.ready();
    return;
  } else if (!browser) {
    informParent.error(-1, `process ${process.pid}: browser not ready`);
    process.exit(1);
  }
  informParent.info(
    `processing with model ${model}:\n- ${previous_url}\n- ${target_url}`
  );
  let resolved_source_url = previous_url;
  let existing_relations = [];
  /**
   * @type {{
   * triples: string[],
   * startIndex: number,
   * endIndex: number,
   * }[]}
   */
  let existing_triples = [];
  //#region Load source info
  if (path.extname(previous_url) === ".json") {
    const json = JSON.parse(fs.readFileSync(previous_url));
    if (typeof json !== "object" || !("source_url" in json)) {
      informParent.error(-1, "invalid json");
      informParent.ready();
      return;
    }
    resolved_source_url = json.source_url;
    existing_relations = json.relations || [];
    existing_triples = json.merged_triples || [];
  }
  //#endregion
  const saveURL = path.resolve(
    baseUrl,
    typeof savePath === "string" && savePath.length > 0
      ? savePath
      : defaultSavePath
  );
  const source_page = await browser.newPage();
  const target_page = await browser.newPage();

  try {
    await source_page.goto(resolved_source_url);
    await target_page.goto(target_url);
    const { processed_text: sourceRaw } = await processor.process(source_page);
    const { processed_text: targetRaw } = await processor.process(target_page);
    const chunks = split2DiffChunks(
      sourceRaw,
      targetRaw,
      contextLength,
      windowLength,
      method
    );

    /**
     * @type {{
     * triples: string[],
     * startIndex: number,
     * endIndex: number,
     * }[]}
     */
    let delete_triples = [];
    /**
     * @type {{
     * triples: string[],
     * startIndex: number,
     * endIndex: number,
     * }[]}
     */
    let add_triples = [];
    const add_triples_set = new Set();
    const delete_triples_set = new Set();
    const existing_triples_set = new Set(
      existing_triples.map((r) => JSON.stringify(r))
    );
    //#region 实验数据
    let costTime = 0;
    let escapeCount = 0;
    let totalUsage = {
      prompt_tokens: 0,
      completion_tokens: 0,
      cached_tokens: 0,
      reasoning_tokens: 0,
    };
    let chunksInfo = [];
    //#endregion
    const chunkLength = chunks.length;
    for (let i = 0; i < chunkLength; i++) {
      const chunk = chunks[i];
      informParent.info(`processing chunk ${i + 1}/${chunkLength}`);

      //  find last triple before the chunk
      const contextTriples = existing_triples
        .filter(
          (t) =>
            t.startIndex < chunk.startIndex &&
            t.endIndex + 1000 > chunk.startIndex
        )
        .reduce((acc, t) => acc.concat(t.triples), []);
      const input = `existing_relations: ${JSON.stringify(
        existing_relations
      )}\ncontext_triples: ${JSON.stringify(
        contextTriples
      )}\ndelete_triples: ${JSON.stringify(
        delete_triples.reduce((acc, t) => acc.concat(t.triples), [])
      )}\nadd_triples: ${JSON.stringify(
        add_triples.reduce((acc, t) => acc.concat(t.triples), [])
      )}\ndiff result:\n${chunk.str}`;
      //#endregion

      let startTime = Date.now();
      let { usage, result } = await chat(
        prompts.relation_diff_prompt_zh_zero_shot_with_rules(
          input,
          prompts.example_of_diff_extraction_one_shot_with_rules
        ),
        max_tokens,
        model
      );
      if (typeof result === "string") {
        informParent.warning(
          `result is not a json object\n at chunk ${chunk.startIndex} ~ ${
            chunk.startIndex + chunk.str.length
          }(Old)`
        );
        escapeCount += 1;
        i--;
        continue;
      }

      //#region 记录实验数据
      let endTime = Date.now();
      costTime += endTime - startTime;
      chunksInfo.push({
        chunkIndex: i,
        strLength: chunk.str.length,
        costTime: endTime - startTime,
      });
      totalUsage.prompt_tokens += usage.prompt_tokens;
      totalUsage.completion_tokens += usage.completion_tokens;
      totalUsage.cached_tokens += usage.prompt_tokens_details.cached_tokens;
      totalUsage.reasoning_tokens +=
        usage.completion_tokens_details.reasoning_tokens;
      //#endregion

      const startIndex = chunk.startIndex;
      const endIndex = chunk.startIndex + chunk.str.length;
      //#region 去重&保证互斥
      existing_relations = uniqueObjects(
        existing_relations.concat(result.relations || [])
      );
      add_triples.push({
        triples: uniqueObjects(result.add_triples || []).filter((t) => {
          return !add_triples_set.has(JSON.stringify(t));
        }),
        startIndex,
        endIndex,
      });
      add_triples = add_triples.map((t) => {
        return {
          triples: t.triples.filter(
            (triple) => !existing_triples_set.has(JSON.stringify(triple))
          ),
          startIndex: t.startIndex,
          endIndex: t.endIndex,
        };
      });
      add_triples[add_triples.length - 1].triples.forEach((t) => {
        add_triples_set.add(JSON.stringify(t));
      });

      delete_triples.push({
        triples: uniqueObjects(result.delete_triples || []).filter(
          (t) =>
            !add_triples_set.has(JSON.stringify(t)) &&
            !delete_triples_set.has(JSON.stringify(t))
        ),
        startIndex,
        endIndex,
      });
      delete_triples[delete_triples.length - 1].triples.forEach((t) => {
        delete_triples_set.add(JSON.stringify(t));
      });
      delete_triples = delete_triples.map((t) => {
        return {
          triples: t.triples.filter(
            (triple) => !add_triples_set.has(JSON.stringify(triple))
          ),
          startIndex: t.startIndex,
          endIndex: t.endIndex,
        };
      });
      //#endregion
    }

    const resultId = uuidv4();
    const fileName = `${resultId}.json`;
    if (!fs.existsSync(saveURL)) {
      fs.mkdirSync(saveURL, { recursive: true });
    }
    fs.writeFileSync(
      path.join(saveURL, fileName),
      JSON.stringify({
        create_time: new Date().toISOString(),
        id: resultId,
        source_url: target_url,
        previous_url: previous_url,
        relations: existing_relations.sort(),
        delete_triples: delete_triples,
        add_triples: add_triples,
        metrics: {
          escapeCount,
          costTime,
          totalUsage,
          chunkLength,
          chunksInfo,
        },
        model: model,
        extraInfo,
      })
    );
    await source_page.close();
    await target_page.close();
    informParent.ready({ resultId });
  } catch (e) {
    informParent.error(-1, e.message);
    await source_page.close();
    await target_page.close();
    informParent.ready({ resultId: null });
  }
});
