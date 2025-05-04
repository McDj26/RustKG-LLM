const puppeteer = require("puppeteer");
const prompts = require("./extract_prompt.js");
const chat = require("../../utils/LLM/parseReply2Json.js");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const uniqueObjects = require("../../utils/uniqueObjects.js");
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
  const { url: pageUrl, baseUrl, savePath, model, ...extraInfo } = msg;
  const defaultSavePath = `./output/${model}`;

  if (!model) {
    informParent.error(-1, `please provide a model`);
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

    let { result } = await chat(
      prompts.relation_extraction_prompt_zh(
        prompts.example_of_relation_extraction,
        input
      ),
      4 * 1024,
      model
    );

    if (typeof result === "string") {
      result = {
        fallback: result,
      };
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
