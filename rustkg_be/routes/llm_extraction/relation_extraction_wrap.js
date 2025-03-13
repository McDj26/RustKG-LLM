const path = require("path");
const URLWhiteList = require("./URLWhiteList");
const fs = require("fs");

module.exports = async function handle(ctx, next) {
  // relation extraction 路由守卫
  const { url } = ctx.request.body;
  if (url.startsWith("file:")) {
    if (!URLWhiteList.some((regExp) => regExp.test(url))) {
      ctx.status = 200;
      ctx.body = JSON.stringify({ resultId: null, links: [] });
      console.log(`${url} is not white listed`);
      return;
    }
    // url format: file:///C:/xxx
    const filePath = path.resolve(url.replace("file:///", ""));
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
    } catch (e) {
      ctx.status = 200;
      ctx.body = JSON.stringify({ resultId: null, links: [] });
      console.log(`${url} does not exist`);
      return;
    }
    const { size: fileSize } = await fs.promises.stat(filePath);
    if (fileSize > 250000) {
      ctx.status = 200;
      ctx.body = JSON.stringify({ resultId: null, links: [] });
      console.log(`${url} is too large with size ${fileSize}B`);
      return;
    }
  } else {
    ctx.status = 200;
    ctx.body = JSON.stringify({ resultId: null, links: [] });
    console.log(`protocol ${url.split(":")[0]} is not supported`);
    return;
  }
  await next();
};
