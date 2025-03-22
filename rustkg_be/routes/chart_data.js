const fs = require("fs");
const path = require("path");

async function handler(ctx) {
  let fileName = ctx.request.query.fileName;
  if (!fileName.endsWith(".json")) {
    fileName += ".json";
  }
  let filePath = fileName;
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, "../output", fileName);
  }
  try {
    const data = JSON.parse(await fs.promises.readFile(filePath, "utf8"));
    let relationPairs = [];
    if (Array.isArray(data)) {
      relationPairs = data;
    } else if (
      data &&
      Object.keys(data).some((key) =>
        ["relation_pairs", "relation pairs", "relation_triples"].includes(key)
      )
    ) {
      relationPairs =
        data["relation_pairs"] ||
        data["relation pairs"] ||
        data["relation_triples"];
    }
    const nodeSet = new Set();
    const chartData = {
      data: [],
      links: [],
    };
    relationPairs.forEach((pair) => {
      const [source, label, target] = pair;
      if (!nodeSet.has(source)) {
        nodeSet.add(source);
        chartData.data.push({ id: source, name: source });
      }
      if (!nodeSet.has(target)) {
        nodeSet.add(target);
        chartData.data.push({ id: target, name: target });
      }
      chartData.links.push({ source: source, target: target, relation: label });
    });
    ctx.status = 200;
    ctx.body = chartData;
  } catch (e) {
    console.error(e);
    ctx.status = 200;
    ctx.body = { data: [], links: [] };
  }
}

module.exports = ["/chart_data", handler];
