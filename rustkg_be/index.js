const koa = require("koa");
const cors = require("@koa/cors");
const bodyparser = require("koa-bodyparser");
const Router = require("koa-router");
const puppeteer = require("puppeteer");

const app = new koa();
const router = new Router();

const structure = require("./routes/structure");
const extract = require("./routes/program_extraction/extract");
const compare = require("./routes/compare");
const relation_extraction_wrap = require("./routes/llm_extraction/relation_extraction_wrap");
const relation_extraction = require("./routes/llm_extraction/relation_extraction");
const gather_history = require("./routes/gather_history");
const chart_data = require("./routes/chart_data");
const merged_data = require("./routes/merged_chart_data");

puppeteer.launch().then((browser) => {
  router.get(structure[0], structure[1](browser));
  router.post(compare[0], compare[1]);
  router.post(extract[0], extract[1](browser, __dirname));
  router.post(
    relation_extraction[0],
    relation_extraction_wrap,
    relation_extraction[1](__dirname)
  );
  router.get(gather_history[0], gather_history[1]);
  router.get(chart_data[0], chart_data[1]);
  router.get(merged_data[0], merged_data[1]);

  app.use(cors());
  app.use(bodyparser());
  app.use(router.routes());
  app.listen(3000);
  console.log("Server running on http://localhost:3000");
});
