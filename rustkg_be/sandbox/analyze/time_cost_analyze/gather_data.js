const fs = require("fs");
const path = require("path");
const { parse } = require("json2csv");
// const TaskManager = require("../../../utils/TaskManager");
// const controller = new TaskManager();

const diffDataPath = path.join(__dirname, "../../exams/diff/output");
const fullDataPath = path.join(__dirname, "../../exams/full/output");

const diffDataOutput = path.join(__dirname, "diff_data.csv");
const fullDataOutput = path.join(__dirname, "full_data.csv");

function findJson(root) {
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
    model: json.model,
    examGroup: json.extraInfo.examGroup,
    costTime: json.metrics.costTime,
    chunkLength: json.metrics.chunkLength,
    escapeCount: json.metrics.escapeCount,
    input_tokens: json.metrics.totalUsage.prompt_tokens,
    output_tokens: json.metrics.totalUsage.completion_tokens,
    reasoning_tokens: json.metrics.totalUsage.reasoning_tokens,
  };
}

(async function main() {
  const diffData = findJson(diffDataPath);
  const fullData = findJson(fullDataPath);

  const processedDiffData = diffData.map(extractStatistics);
  const processedFullData = fullData.map(extractStatistics);

  const diffDataCSV = parse(processedDiffData);
  const fullDataCSV = parse(processedFullData);

  await fs.promises.writeFile(diffDataOutput, diffDataCSV);
  await fs.promises.writeFile(fullDataOutput, fullDataCSV);
  console.log("done");
})();
