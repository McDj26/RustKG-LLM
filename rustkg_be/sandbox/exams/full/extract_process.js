const puppeteer = require("puppeteer");
const prompts = require("./extract_prompt.js");
const chat = require("../../utils/LLM/parseReply2Json.js");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const ExtractProcessor = require("../../utils/crawler/ExtractProcessor.js");
const processor = new ExtractProcessor(require("../../assets/basicRule.json"));

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
    url: pageUrl,
    baseUrl,
    savePath,
    model = process.env.LLM_MODEL,
    ...extraInfo
  } = msg;
  const defaultSavePath = `./output/${model}`;

  if (!model) {
    informParent.error(-1, "please provide a model");
    informParent.ready();
    return;
  } else if (!pageUrl) {
    informParent.warning("url not provided");
    informParent.ready();
    return;
  } else if (!baseUrl) {
    informParent.error(-1, "base url not provided");
    informParent.ready();
    return;
  } else if (!browser) {
    informParent.error(-1, `process ${process.pid}: browser not ready`);
    process.exit(1);
  }
  informParent.info(`processing ${pageUrl}`);
  const saveURL = path.resolve(
    baseUrl,
    typeof savePath === "string" && savePath.length > 0
      ? savePath
      : defaultSavePath
  );
  const page = await browser.newPage();

  try {
    await page.goto(pageUrl);
    const { processed_text: rawText } = await processor.process(page);
    const input = `existing relations: ["is a", "has full name", "stable since", "is successor of", "is predecessor of"]\nsource text:\n${rawText}`;

    //#region 实验数据
    let costTime = 0;
    let escapeCount = 0;
    let totalUsage = {
      prompt_tokens: 0,
      completion_tokens: 0,
      cached_tokens: 0,
      reasoning_tokens: 0,
    };
    //#endregion

    const startTime = Date.now();
    let { usage, result } = await chat(
      prompts.relation_extraction_prompt_zh(
        prompts.example_of_relation_extraction,
        input
      )
    );

    //#region 记录实验数据
    costTime = Date.now() - startTime;
    totalUsage.prompt_tokens += usage.prompt_tokens;
    totalUsage.completion_tokens += usage.completion_tokens;
    totalUsage.cached_tokens += usage.prompt_tokens_details.cached_tokens;
    totalUsage.reasoning_tokens +=
      usage.completion_tokens_details.reasoning_tokens;
    //#endregion

    if (typeof result === "string") {
      result = {
        fallback: result,
      };
      escapeCount += 1;
    }

    const resultId = uuidv4();
    const fileName = `${resultId}.json`;
    const links = uniqueObjects(
      (result.links || []).map((link) => link.replace(/\#.*$/g, ""))
    );
    if (!fs.existsSync(saveURL)) {
      fs.mkdirSync(saveURL, { recursive: true });
    }
    fs.writeFileSync(
      path.join(saveURL, fileName),
      JSON.stringify({
        relations: uniqueObjects(result.relations || []),
        relation_triples: uniqueObjects(result.relation_triples || []),
        links: links,
        create_time: new Date().toISOString(),
        id: resultId,
        model: model,
        source_url: pageUrl,
        metrics: {
          escapeCount,
          costTime,
          totalUsage,
          length: rawText.length,
        },
        extraInfo,
      })
    );
    await page.close();
    informParent.ready({ resultId, links });
  } catch (e) {
    informParent.error(-1, e.message);
    await page.close();
    informParent.ready({ resultId: null, links: [] });
  }
});
