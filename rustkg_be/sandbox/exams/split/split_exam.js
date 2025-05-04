const fs = require("fs");
const path = require("path");
const parallelize = require("../../../utils/parallelize");
const TaskManager = require("../../../utils/TaskManager");
const { exec, stop } = parallelize(require.resolve("./split_process.js"));
const controller = new TaskManager(16);

const examURLs = require("../examURLs.json");
const models = ["deepseek-r1-250120" /* , "deepseek-v3-241226" */];
const windowLength = [/* 7000, 15000, 23000, 31000, */ 39000];
const contextLength = 500;

const tempArgs = models.reduce((arr, model) => {
  const urls_len = examURLs.length;
  const windows_len = windowLength.length;
  for (let i = 0; i < urls_len; i++) {
    for (let j = 0; j < windows_len; j++) {
      arr.push({
        model,
        windowLength: windowLength[j],
        source_url: examURLs[i],
      });
    }
  }
  return arr;
}, []);

const testTimes = 1;
let testArgs = [];
for (let index = 0; index < testTimes; index++) {
  testArgs = testArgs.concat(tempArgs);
}

(async function main() {
  const length = testArgs.length;
  let finishCount = 0;
  await controller.mapTasks(
    testArgs,
    async ({ model, source_url, windowLength }) => {
      const { reason, resultId, links } = await exec({
        source_url,
        baseUrl: __dirname,
        contextLength,
        windowLength,
        model,
        savePath: "output-primitives",
        startTime: new Date().toISOString(),
        examGroup: "split",
        examParams: {
          windowLength,
        },
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
