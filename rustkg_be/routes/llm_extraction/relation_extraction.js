const _ = require("lodash");
const fs = require("fs");
const parallelize = require("../../utils/parallelize");
const { exec, stop } = parallelize(require.resolve("./extract_process.js"));
const URLBlacklist = require("./URLBlackList");
const failed = require("../../assets/failed.json");
const failedSet = new Set(failed.map((i) => i.url));
const visited = new Set(
  require("../../assets/visited.json").concat(failed.map((i) => i.url))
);

/**
 * @param {string} baseUrl
 * @param {import('koa').Context} ctx
 * @param {import('koa').Next} next
 */
async function handler(baseUrl, ctx, next) {
  const {
    url,
    savePath,
    force = false,
    model = "deepseek-r1-250120",
  } = ctx.request.body;
  if (!force && (failedSet.has(url) || visited.has(url))) {
    ctx.status = 200;
    ctx.body = JSON.stringify({ resultId: null, links: [] });
    return;
  }
  try {
    const { resultId, links, reason } = await exec({
      url,
      baseUrl,
      savePath,
      model,
    });
    if (!resultId) {
      failed.push({ url, reason });
      failedSet.add(url);
      await fs.promises.writeFile(
        require.resolve("../../assets/failed.json"),
        JSON.stringify(failed)
      );
      ctx.status = 200;
      ctx.body = JSON.stringify({ resultId, links: [] });
      return;
    }
    visited.add(url);
    await fs.promises.writeFile(
      require.resolve("../../assets/visited.json"),
      JSON.stringify(Array.from(visited))
    );
    const resolvedUrls = links.map((link) => new URL(link, url).href);
    const filteredUrls = resolvedUrls.filter((url) => {
      for (let regExp of URLBlacklist) {
        if (regExp.test(url)) {
          return false;
        }
      }
      return !visited.has(url);
    });
    ctx.status = 200;
    ctx.body = JSON.stringify({ resultId, links: filteredUrls });
  } catch (e) {
    console.error(e);
    ctx.status = 400;
    ctx.body = "Bad Request";
  }
}

module.exports = ["/relation_extraction", _.curry(handler)];
