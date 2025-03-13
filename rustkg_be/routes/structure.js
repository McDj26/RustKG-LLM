const _ = require("lodash");

const TaskManager = require("../utils/TaskManager");
const controller = new TaskManager(50);

/**
 * @param {import('puppeteer').Page} page
 * @param {object} result
 */
async function analyzePage(page, result) {
  try {
    const res = await page.evaluate(() => {
      function merge(a, b) {
        for (const key in b) {
          if (
            key in a &&
            typeof a[key] === "object" &&
            typeof b[key] === "object"
          ) {
            merge(a[key], b[key]);
          } else {
            a[key] = b[key];
          }
        }
      }

      function traverse(node) {
        const result = {};
        if (
          node.nodeType !== Node.ELEMENT_NODE ||
          node.tagName === "SCRIPT" ||
          node.tagName === "STYLE"
        )
          return result;

        let key = node.tagName.toLowerCase();
        // ignore id for smaller result
        // if (node.id) {
        //   key += "#" + node.id;
        // }
        if (node.classList.length > 0) {
          key +=
            "." +
            Array.from(node.classList || [])
              .sort()
              .join(" ");
        }
        result[key] = {};

        const childNodes = node.children; // 只遍历元素节点
        if (childNodes.length > 0) {
          for (let i = childNodes.length - 1; i >= 0; i--) {
            merge(result[key], traverse(childNodes[i]));
          }
        }

        return result;
      }

      return traverse(document.body);
    });
    _.merge(result, res);
  } catch (e) {
    console.error(
      "Structure analysis failed at page:",
      page.url(),
      "\n  -> Error Info:",
      e.message
    );
  }
}

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
 * @param {object} result
 * @param {string} selector
 * @param {Set<string>} records
 */
async function analyze(context, urls, selector, result, records) {
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

    await analyzePage(page, result);

    let links = [];
    if (selector.length > 0) {
      links = await analyzeLinks(page, selector);
    }
    await page.close();
    console.info("-finished:", url);

    if (links.length > 0) {
      await analyze(context, links, selector, result, records);
    }
  });
}

/**
 * @type {(browser: import('puppeteer').Browser) => import('koa').Middleware}
 */
const handler = (browser) => {
  return async (ctx, next) => {
    const context = await browser.createBrowserContext();
    const entry = ctx.query.url;
    const follows =
      typeof ctx.query.follows === "string" ? ctx.query.follows : "";

    const result = {};
    const record = new Set();

    try {
      await analyze(context, [entry], follows, result, record);
      ctx.body = JSON.stringify(result);
    } catch (e) {
      console.error(e);
      ctx.status = 404;
      ctx.body = e.message;
    } finally {
      await context.close();
    }
  };
};

module.exports = ["/structure", handler];
