const puppeteer = require("puppeteer");
const prompts = require("./prompt.js");
const chat = require("../../../utils/LLM/parseReply2Json.js");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const splitStr = require("../../../utils/split.js");
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
    contextLength,
    windowLength,
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
  } else if (!source_url) {
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
  informParent.info(`processing with model ${model}:\n- ${source_url}`);

  let existing_relations = [];
  let existing_triples = [];
  let existing_links = [];
  const saveURL = path.resolve(
    baseUrl,
    typeof savePath === "string" && savePath.length > 0
      ? savePath
      : defaultSavePath
  );
  const source_page = await browser.newPage();

  try {
    await source_page.goto(source_url);
    const { processed_text: sourceRaw } = await processor.process(source_page);
    const chunks = splitStr(sourceRaw, windowLength, contextLength);

    let add_triples = [];
    let add_links = [];
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
      const souceText = `<sourceText>\n${chunk.content}\n</sourceText>`;
      const context =
        chunk.context.length > 0
          ? `<context>\n${chunk.context}\n</context>`
          : "";

      const input = `existing_relations: ${JSON.stringify(
        existing_relations
      )}\nexisting_triples: ${JSON.stringify(
        existing_triples
      )}\n${context}\n${souceText}`;
      //#endregion

      let startTime = Date.now();
      let { usage, result } = await chat(
        prompts.relation_extraction_prompt_zh(
          prompts.example_of_relation_extraction,
          input
        ),
        max_tokens,
        model
      );
      let endTime = Date.now();
      //#region 记录实验数据
      costTime += endTime - startTime;
      chunksInfo.push({
        contextLength: chunk.context.length,
        contentLength: chunk.content.length,
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
      add_triples = uniqueObjects(add_triples.concat(result.add_triples || []));
      add_links = uniqueObjects(
        (result.add_links || [])
          .map((l) => l.replace(/\#.*$/g, ""))
          .concat(add_links)
      );
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
        source_url: source_url,
        relations: existing_relations.sort(),
        add_triples: add_triples.sort(),
        add_links: add_links.sort(),
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
    informParent.ready({ resultId, links: existing_links });
  } catch (e) {
    informParent.error(-1, e.message);
    await source_page.close();
    informParent.ready({ resultId: null, links: [] });
  }
});
