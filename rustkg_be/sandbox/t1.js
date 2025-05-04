const fs = require("fs");
const path = require("path");

const directory = path.resolve(
  __dirname,
  "./exams/full/output/doubao-1-5-pro-32k-250115"
);

const dirs = fs.readdirSync(directory);

const statistic = dirs.reduce((prev, curr) => {
  const jsonPath = path.join(directory, curr);
  const json = JSON.parse(fs.readFileSync(jsonPath));
  if (!(json.extraInfo.sourceId in prev)) {
    prev[json.extraInfo.sourceId] = 0;
  }
  prev[json.extraInfo.sourceId]++;
  return prev;
}, {});

console.log(statistic);
