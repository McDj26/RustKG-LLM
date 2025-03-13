const fs = require("fs");
const path = require("path");
const parallelize = require("../../../utils/parallelize");
const TaskManager = require("../../../utils/TaskManager");
const { exec, stop } = parallelize(
  require.resolve("../../../routes/llm_extraction/extract_process.js")
);
const controller = new TaskManager(16);

const examIds = [
  "ffa3506d-74ba-4836-95d8-604a7652b3c9",
  "0c9c4f92-3386-4e7c-a393-6932b6382dc0",
  "0e3252a6-fe43-43bd-ad68-ee4ab128985d",
  "1c59a1bc-cb2a-4704-9fad-173f6c255b4d",
  "1f8962b2-201e-4b73-9e69-a70ef742f0d5",
  "4b7525ab-ff22-413a-b712-459b6a3d36cd",
  "05aff626-3bac-49b0-89ac-cbf16fee709d",
  "7c6faca8-74a2-4d34-a56e-3ac3bfeb2137",
  "17c901ac-4d4f-406d-89bb-48fa684b9d4e",
  "59f2e3e0-0e10-4604-962f-0891aa5cbe30",
];
const jsonPaths = examIds.map((id) =>
  path.join(__dirname, "../../../output/deepseek-r1-250120", id + ".json")
);
const jsons = jsonPaths.map((path) => JSON.parse(fs.readFileSync(path)));
const models = [
  /* "deepseek-r1-250120", "doubao-1-5-pro-32k-250115", */ "deepseek-v3-241226",
];

const tempArgs = models.reduce((arr, model) => {
  const len = jsons.length;
  for (let index = 0; index < len; index++) {
    arr.push({
      model,
      url: jsons[index].source_url.replace("1.30", "1.31"),
      source_id: jsons[index].id,
    });
  }
  return arr;
}, []);

const testTimes = 5;
let testArgs = [];
for (let index = 0; index < testTimes; index++) {
  testArgs = testArgs.concat(tempArgs);
}

(async function main() {
  const length = testArgs.length;
  let finishCount = 0;
  await controller.mapTasks(testArgs, async ({ model, url, source_id }) => {
    const { reason, resultId, links } = await exec({
      url,
      baseUrl: __dirname,
      model,
      startTime: new Date().toISOString(),
      examGroup: "full",
      sourceId: source_id,
    });
    if (!resultId) {
      console.error(reason);
    }
    console.clear();
    console.log(`Total progress ${++finishCount} - ${length}`);
  });
  stop();
  process.exit(0);
})();
