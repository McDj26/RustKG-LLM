const puppeteer = require("puppeteer");
const prompts = require("./prompt.js");
const chat = require("../../../utils/LLM/parseReply2Json.js");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const split2DiffChunks = require("../../../utils/diff/splitChunksV2");
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
    source_url,
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
  } else if (!source_url || !target_url) {
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
    `processing with model ${model}:\n- ${source_url}\n- ${target_url}`
  );
  let resolved_source_url = source_url;
  let existing_relations = [];
  let existing_triples = [];
  let existing_links = [];
  //#region Load source info
  if (path.extname(source_url) === ".json") {
    const json = JSON.parse(fs.readFileSync(source_url));
    if (typeof json !== "object" || !("source_url" in json)) {
      informParent.error(-1, "invalid json");
      informParent.ready();
      return;
    }
    resolved_source_url = json.source_url;
    existing_relations = json.relations || [];
    existing_triples =
      json.existing_triples ||
      json.relation_pairs ||
      json["relation pairs"] ||
      [];
    existing_links = json.links || [];
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

    let to_delete_triples = [];
    let to_add_triples = [];
    let to_delete_links = [];
    let to_add_links = [];
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

      //#region 构造输入
      const oldText = chunk.oldStr;
      const oldContext =
        oldText.length > 0
          ? `<oldContext>\n${chunk.oldContext}\n</oldContext>`
          : "";
      const newText = chunk.newStr;
      const newContext =
        newText.length > 0
          ? `<newContext>\n${chunk.newContext}\n</newContext>`
          : "";

      const input = `existing_relations: ${JSON.stringify(
        existing_relations
      )}\nexisting_triples: ${JSON.stringify(
        existing_triples
      )}\nto_delete_triples: ${JSON.stringify(
        to_delete_triples
      )}\nto_add_triples: ${JSON.stringify(
        to_add_triples
      )}\nexisting_links: ${JSON.stringify(
        existing_links
      )}\nto_delete_links: ${JSON.stringify(
        to_delete_links
      )}\nto_add_links: ${JSON.stringify(
        to_add_links
      )}\n${oldContext}\n${oldText}\n${newContext}\n${newText}`;
      //#endregion

      let startTime = Date.now();
      let { usage, result } = await chat(
        prompts.relation_diff_prompt_zh(
          prompts.example_of_diff_extraction,
          input
        ),
        max_tokens,
        model
      );
      let endTime = Date.now();
      //#region 记录实验数据
      costTime += endTime - startTime;
      chunksInfo.push({
        oldContextLength: oldContext.length,
        oldStrLength: oldText.length,
        newContextLength: newContext.length,
        newStrLength: newText.length,
        costTime: endTime - startTime,
      });
      totalUsage.prompt_tokens += usage.prompt_tokens;
      totalUsage.completion_tokens += usage.completion_tokens;
      totalUsage.cached_tokens += usage.prompt_tokens_details.cached_tokens;
      totalUsage.reasoning_tokens +=
        usage.completion_tokens_details.reasoning_tokens;
      if (typeof result === "string") {
        informParent.warning(
          "result is not a json object\n at chunk: " + chunk
        );
        escapeCount += 1;
        continue;
      }
      //#endregion

      //#region 去重&保证互斥
      existing_relations = uniqueObjects(
        existing_relations.concat(result.relations || [])
      );
      to_add_triples = uniqueObjects(
        to_add_triples.concat(result.to_add_triples || [])
      );
      to_add_links = uniqueObjects(
        (result.to_add_links || [])
          .map((l) => l.replace(/\#.*$/g, ""))
          .concat(to_add_links)
      );
      const to_add_triples_set = new Set(
        to_add_triples.map((t) => JSON.stringify(t))
      );
      const to_add_links_set = new Set(to_add_links);
      to_delete_triples = uniqueObjects(
        to_delete_triples.concat(result.to_delete_triples || []).filter((t) => {
          return !to_add_triples_set.has(JSON.stringify(t));
        })
      );
      to_delete_links = uniqueObjects(
        (result.to_delete_links || [])
          .map((l) => l.replace(/\#.*$/g, ""))
          .concat(to_delete_links)
          .filter((t) => {
            return !to_add_links_set.has(t);
          })
      );
      //#endregion
    }
    const resultId = uuidv4();

    const fileName = `${resultId}.json`;
    if (!fs.existsSync(saveURL)) {
      fs.mkdirSync(saveURL, { recursive: true });
    }
    //#region 保留有效结果
    const existing_triples_set = new Set(
      existing_triples.map((r) => JSON.stringify(r))
    );
    const existing_links_set = new Set(existing_links);
    to_add_triples = to_add_triples.filter((t) => {
      return !existing_triples_set.has(JSON.stringify(t));
    });
    to_add_links = to_add_links.filter((t) => {
      return !existing_links_set.has(JSON.stringify(t));
    });
    //#endregion
    fs.writeFileSync(
      path.join(saveURL, fileName),
      JSON.stringify({
        create_time: new Date().toISOString(),
        id: resultId,
        source_url: target_url,
        previous_url: source_url,
        relations: existing_relations.sort(),
        delete_triples: to_delete_triples.sort(),
        add_triples: to_add_triples.sort(),
        delete_links: to_delete_links.sort(),
        add_links: to_add_links.sort(),
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
    informParent.ready({ resultId, links: existing_links });
  } catch (e) {
    informParent.error(-1, e.message);
    await source_page.close();
    await target_page.close();
    informParent.ready({ resultId: null, links: [] });
  }
});
