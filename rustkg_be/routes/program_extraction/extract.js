const fs = require("fs");
const path = require("path");
const TaskManager = require("../../utils/TaskManager");
const ExtractProcessor = require("../../utils/crawler/ExtractProcessor");
const controller = new TaskManager(50);
const { v4: uuidv4 } = require("uuid");

/**
 * @param {import('puppeteer').Page} page
 * @param {string} selector - A CSS selector for selecting <a> elements.
 * @returns {Promise<string[]>} An array of absolute URLs.
 */
async function analyzeLinks(page, selector) {
  try {
    // Function to convert relative URLs to absolute URLs within the browser context
    const absoluteUrls = await page.$$eval(
      selector,
      (anchors, pageUrl) => {
        return anchors
          .filter((anchor) => anchor.href) // Ensure href is present
          .map((anchor) => {
            // Create a new URL object using the current page's URL as the base
            const urlObj = new URL(anchor.href, pageUrl);
            return urlObj.href; // Return the absolute URL string
          });
      },
      page.url()
    ); // Pass the page URL as an argument

    return absoluteUrls;
  } catch (e) {
    console.error(
      "Links analysis failed at page:",
      page.url(),
      "\n  -> Error Info:",
      e.message
    );
    return [];
  }
}

/**
 * @param {import('puppeteer').BrowserContext} context
 * @param {string[]} urls
 * @param {string} selector
 * @param {Set<string>} records
 * @param {ExtractProcessor} processor
 * @param {string} saveURL
 */
async function analyze(context, urls, selector, records, processor, saveURL) {
  if (urls.length === 0) return;

  urls = urls
    .map((url) => url.replace(/\\/g, "/").replace(/\#(.*)$/, ""))
    .filter((url) => {
      if (records.has(url)) {
        return false;
      }
      records.add(url);
      return true;
    });

  await controller.mapTasks(urls, async (url) => {
    const page = await context.newPage();
    console.info("analyzing:", url);
    await page.goto(url);

    const result = await processor.process(page);

    const stream = fs.createWriteStream(path.join(saveURL, `${uuidv4()}.json`));
    stream.write(JSON.stringify(result));
    stream.end();

    let links = [];
    if (selector.length > 0) {
      links = await analyzeLinks(page, selector);
    }
    await page.close();
    console.info("-finished:", url);

    if (links.length > 0) {
      await analyze(context, links, selector, records, processor, saveURL);
    }
  });
}

/**
 * @type {(browser: import('puppeteer').Browser, baseURL: string) => import('koa').Middleware}
 */
const handler = (browser, baseURL) => {
  baseURL = baseURL.replace(/\\/g, "/");
  return async (ctx, next) => {
    const context = await browser.createBrowserContext();

    const entry = ctx.request.body.url;
    const follows =
      typeof ctx.request.body.follows === "string"
        ? ctx.request.body.follows
        : "";
    const customSavePath =
      typeof ctx.request.body.path === "string" &&
      ctx.request.body.path.length > 0
        ? ctx.request.body.path
        : "./output";

    const saveURL = path.resolve(baseURL, customSavePath);
    const extractRule = ctx.request.body.extractRule || {};
    const record = new Set();

    try {
      if (!fs.existsSync(saveURL)) {
        fs.mkdirSync(saveURL);
      }

      const processor = new ExtractProcessor(extractRule);
      const startTime = Date.now();

      await analyze(context, [entry], follows, record, processor, saveURL);

      const endTime = Date.now();
      ctx.status = 200;
      ctx.body = {
        msg: "OK",
        timeCost: endTime - startTime,
      };
    } catch (e) {
      ctx.status = 404;
      ctx.body = e.message;
      console.error(e);
    } finally {
      await context.close();
    }
  };
};

module.exports = ["/extract", handler];
