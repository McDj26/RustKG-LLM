const fs = require("fs");
const path = require("path");
const parallelize = require("../../../utils/parallelize");
const TaskManager = require("../../../utils/TaskManager");
const { exec, stop } = parallelize(require.resolve("./diff_process.js"));
const controller = new TaskManager(16);

const examIds = require("../examIds.json");
const jsonPaths = examIds.map((id) =>
  path.join(__dirname, "../split/output-primitives", id + ".json")
);
const jsons = jsonPaths.map((path) => JSON.parse(fs.readFileSync(path)));
const models = ["deepseek-r1-250120" /* , "deepseek-v3-241226" */];
const contextLength = 500;
const windowLengths = [/* 7000, 15000, 23000, 31000,  */ 39000];

const tempArgs = models.reduce((arr, model) => {
  const jsons_len = jsons.length;
  const windows_len = windowLengths.length;
  for (let i = 0; i < jsons_len; i++) {
    for (let j = 0; j < windows_len; j++) {
      arr.push({
        model,
        windowLength: windowLengths[j],
        source_url: jsonPaths[i],
        target_url: jsons[i].source_url.replace("1.30", "1.31"),
        source_id: jsons[i].id,
      });
    }
  }
  return arr;
}, []);

const testTimes = 3;
let testArgs = [];
for (let index = 0; index < testTimes; index++) {
  testArgs = testArgs.concat(tempArgs);
}

(async function main() {
  const length = testArgs.length;
  let finishCount = 0;
  await controller.mapTasks(
    testArgs,
    async ({ model, source_url, target_url, source_id, windowLength }) => {
      const { reason, resultId, links } = await exec({
        source_url,
        target_url,
        contextLength,
        windowLength,
        baseUrl: __dirname,
        savePath: "output-primitives",
        model,
        startTime: new Date().toISOString(),
        examGroup: "diff",
        examParams: {
          windowLength,
        },
        sourceId: source_id,
      });
      if (!resultId) {
        console.error(reason);
      }
      console.clear();
      console.log(`Total progress ${++finishCount} - ${length}`);
    }
  );
  stop();
  process.exit(0);
})();
