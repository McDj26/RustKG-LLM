const fs = require("fs");
const path = require("path");

const dir =
  "D:\\Lessons\\projects\\rustKG\\rustkg_be\\output\\deepseek-r1-250120";

const files = fs
  .readdirSync(dir)
  .filter((file) => path.extname(file) === ".json");
const result = [];

files.forEach((file) => {
  const filePath = path.join(dir, file);
  const data = JSON.parse(fs.readFileSync(filePath));
  const sourceUrl = data.source_url.replace("file:///", "");
  const name = path.basename(sourceUrl);
  const id = data.id;
  if (fs.existsSync(sourceUrl) === false) return;
  const stats = fs.statSync(sourceUrl);
  if (stats.size > 40 * 1024 && stats.size < 50 * 1024) {
    result.push({ id, name, size: stats.size });
  }
});

console.log(result);
