const fs = require("fs");
const path = require("path");
const { parse } = require("json2csv");
const TaskManager = require("../../../utils/TaskManager");
const controller = new TaskManager(16);
// const TaskManager = require("../../../utils/TaskManager");
// const controller = new TaskManager();

// const diffDataPath = path.join(__dirname, "../../exams/diff/output");
// const fullDataPath = path.join(__dirname, "../../exams/full/output");
const splitDataPath = path.join(__dirname, "../../exams/split/output");

// const diffDataOutput = path.join(__dirname, "diff_data.csv");
// const fullDataOutput = path.join(__dirname, "full_data.csv");
const splitDataOutput = path.join(__dirname, "split_data.csv");

const inputPaths = [splitDataPath];
const outputPaths = [splitDataOutput];

function findJson(root) {
  if (!fs.existsSync(root)) {
    return [];
  }
  const dirs = fs.readdirSync(root);
  let jsons = [];
  dirs.map((dir) => {
    const filePath = path.join(root, dir);
    if (path.extname(filePath) === ".json") {
      jsons.push(JSON.parse(fs.readFileSync(filePath)));
    } else if (fs.statSync(filePath).isDirectory()) {
      jsons = jsons.concat(findJson(filePath));
    }
    return;
  });
  return jsons;
}

function extractStatistics(json) {
  return {
    id: json.extraInfo.sourceId || json.id,
    source_url: json.source_url,
    model: json.model,
    examGroup: json.extraInfo.examGroup,
    windowLength: json.extraInfo.examParams?.windowLength,
    costTime: json.metrics.costTime,
    chunkLength: json.metrics.chunkLength,
    escapeCount: json.metrics.escapeCount,
    input_tokens: json.metrics.totalUsage.prompt_tokens,
    output_tokens: json.metrics.totalUsage.completion_tokens,
    reasoning_tokens: json.metrics.totalUsage.reasoning_tokens,
  };
}

(async function main() {
  const gatheredDatas = inputPaths.map(findJson);
  const processedDatas = gatheredDatas.map((data) =>
    data.map(extractStatistics)
  );
  const csvs = processedDatas.map((data) => data.length && parse(data));

  await controller.mapTasks(csvs, async (csv, index) => {
    await fs.promises.writeFile(outputPaths[index], csv);
  });

  console.log("done");
})();
