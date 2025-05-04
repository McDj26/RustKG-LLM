const fs = require("fs");
const path = require("path");
const resultsPath = path.join(__dirname, "../sandbox/exams/effective/output");

const previousVersions = {
  "1.60": "1.50",
  "1.50": "1.40",
  "1.40": "1.30",
  "1.30": "1.20",
  "1.20": "1.10",
};

async function handler(ctx) {
  const apiName = ctx.request.query.apiName;
  const moduleDir = path.join(
    resultsPath,
    fs.readdirSync(resultsPath).find((dir) => {
      const metaPath = path.join(resultsPath, dir, "meta.json");
      if (!fs.existsSync(metaPath)) return false;
      const meta = JSON.parse(fs.readFileSync(metaPath));
      return meta.api_name === apiName;
    }) || ""
  );
  if (moduleDir === resultsPath) {
    ctx.message = { data: [], links: [] };
    ctx.status = 200;
    return;
  }
  try {
    const mergedResults = fs
      .readdirSync(moduleDir)
      .filter((s) => s.startsWith("merged"))
      .map((f) => {
        const json = JSON.parse(fs.readFileSync(path.join(moduleDir, f)));
        const triples = json.merged_triples.reduce(
          (acc, tripleRecord) => acc.concat(tripleRecord.triples),
          []
        );
        const version = json.source_url
          .replace("file:///C:/Users/Dj/.rustup/toolchains/", "")
          .replace(/-.*/gi, "");
        const previousVersion = previousVersions[version];
        return {
          version,
          triples,
          previousVersion,
          changes_triples: json.changes_info_triples,
        };
      });
    const versionNodes = mergedResults.map((r) => ({
      id: `${r.version}`,
      name: `${apiName}-${r.version}`,
      version: r.version,
    }));
    const chartData = {
      data: [{ id: apiName, name: apiName }, ...versionNodes],
      links: versionNodes.map((node) => ({
        source: apiName,
        target: `${apiName}:${node.version}`,
        relation: "has version",
      })),
    };
    const nodeSet = new Set(chartData.data.map((data) => data.id));
    const linkToMap = new Map();
    mergedResults.forEach(
      ({ triples, version, previousVersion, changes_triples }) => {
        triples.forEach((pair) => {
          const [source, label, target] = pair;
          const sourceId = `${source}:${version}`;
          const targetId = `${target}:${version}`;
          if (!nodeSet.has(sourceId)) {
            nodeSet.add(sourceId);
            chartData.data.push({ id: sourceId, name: source });
          }
          if (!nodeSet.has(targetId)) {
            nodeSet.add(targetId);
            chartData.data.push({ id: targetId, name: target });
          }
          chartData.links.push({
            source: sourceId,
            target: targetId,
            relation: label,
          });
          if (!linkToMap.has(sourceId)) {
            linkToMap.set(sourceId, new Set());
          }
          linkToMap.get(sourceId).add(targetId);
        });
        changes_triples?.forEach((pair) => {
          const [source, label, target] = pair;
          const sourceId = `${source}:${previousVersion}`;
          const targetId = `${target}:${version}`;
          if (!nodeSet.has(sourceId)) {
            nodeSet.add(sourceId);
            chartData.data.push({ id: sourceId, name: source });
          }
          if (!nodeSet.has(targetId)) {
            nodeSet.add(targetId);
            chartData.data.push({ id: targetId, name: target });
          }
          chartData.links.push({
            source: sourceId,
            target: targetId,
            relation: label,
          });
          if (!linkToMap.has(targetId)) {
            linkToMap.set(targetId, new Set());
          }
          if (!linkToMap.get(targetId).has(`${apiName}:${version}`)) {
            chartData.links.push({
              source: targetId,
              target: `${apiName}:${version}`,
              relation: "relates to",
            });
            linkToMap.get(targetId).add(`${apiName}:${version}`);
          }
        });
      }
    );
    ctx.status = 200;
    ctx.body = chartData;
  } catch (e) {
    console.error(e);
    ctx.status = 200;
    ctx.body = { data: [], links: [] };
  }
}

module.exports = ["/merged_chart_data", handler];
