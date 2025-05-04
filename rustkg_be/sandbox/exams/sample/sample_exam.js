const fs = require("fs");
const path = require("path");

const relative_path = "../merge/output/one-shot-with-rules";

const sample_target = path.join(
  __dirname,
  relative_path,
  "merged_triples.json"
);
const sample_output = path.join(
  __dirname,
  "output",
  relative_path.split("/").pop() || ".",
  "sampled_triples.json"
);
const sampling_rate = 0.01; // 采样比例
const triples = JSON.parse(fs.readFileSync(sample_target)).mergedTriples;

function swap(arr, i, j) {
  const temp = arr[i];
  arr[i] = arr[j];
  arr[j] = temp;
}

function sample(triples, rate) {
  const sampleSize = Math.floor(triples.length * rate) || 1; // 计算采样大小
  const sampledTriples = [];
  let left_size = triples.length; // 剩余元素数量
  for (let index = 0; index < sampleSize; index++) {
    const randomIndex = Math.floor(Math.random() * left_size); // 随机索引
    // 采样元素
    sampledTriples.push(triples[randomIndex]);
    swap(triples, randomIndex, triples.length - 1 - index); // 将已采样的元素交换到数组末尾
    left_size--; // 剩余元素数量减一
  }
  return sampledTriples.sort();
}

const sampledTriples = sample(triples, sampling_rate);
if (!fs.existsSync(path.dirname(sample_output))) {
  fs.mkdirSync(path.dirname(sample_output), { recursive: true });
}
fs.writeFileSync(sample_output, JSON.stringify(sampledTriples, null, 2));
