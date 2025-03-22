const fs = require("fs");
const path = require("path");
const uniqueObjects = require("../../../utils/uniqueObjects.js");

const targetDir = path.join(__dirname, "../full/output/deepseek-r1-250120");

function mergeRelationTriples(dir) {
  const files = fs.readdirSync(dir);
  const urlSet = new Set();
  let relationTriples = [];
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (
      path.extname(filePath) !== ".json" ||
      file === "merged_relation_triples.json"
    )
      return;
    const data = JSON.parse(fs.readFileSync(filePath));
    if (data.source_url.endsWith(".rs.html")) return;
    if (urlSet.has(data.source_url)) {
      relationTriples = uniqueObjects(
        relationTriples.concat(data.relation_triples)
      );
    } else {
      urlSet.add(data.source_url);
      relationTriples.push(...data.relation_triples);
    }
  });
  return uniqueObjects(relationTriples);
}

(async function main() {
  const relationTriples = mergeRelationTriples(targetDir);
  fs.writeFileSync(
    path.join(targetDir, "merged_relation_triples.json"),
    JSON.stringify(relationTriples, null, 2)
  );
  console.log("Relation triples merged successfully.");
})();
