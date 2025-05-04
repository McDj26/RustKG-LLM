const path = require("path");
const fs = require("fs");
const os = require("os");
const parallelize = require("../../../utils/parallelize");
const TaskManager = require("../../../utils/TaskManager");
const uniqueObjects = require("../../../utils/uniqueObjects.js");

//#region parallelize
const { exec: processWithSplit, stop: stopSplit } = parallelize(
  require.resolve("./split_process.js")
);
const { exec: processWithDiff, stop: stopDiff } = parallelize(
  require.resolve("./diff_process.js")
);
const { exec: processWithEvolution, stop: stopEvolution } = parallelize(
  require.resolve("./evolution_process.js")
);
//#endregion

if (!fs.existsSync(path.join(__dirname, "examURLs.json"))) {
  fs.writeFileSync(path.join(__dirname, "examURLs.json"), "[]");
}
if (!fs.existsSync(path.join(__dirname, "examRecords.json"))) {
  fs.writeFileSync(path.join(__dirname, "examRecords.json"), "{}");
}

//#region configs
const examURLs = require("./examURLs.json");
const examRecords = require("./examRecords.json");
const examVersions = require("./examVersions.json");
const model = "deepseek-r1-250120";
const contextLength = 400;
const windowLength = 39000;
const maxAnalyzeTimes = 3;
const outputsPath = path.join(__dirname, "output/zero-shot-with-rules");
const maxConcurrency = Math.floor(os.cpus().length / 3) || 1;
const changesAnalyzer = new TaskManager(os.cpus().length);
function getExamURL(baseExamURL, examVersion) {
  // path to rust doc
  return `file:///C:/Users/Dj/.rustup/toolchains/${examVersion}-x86_64-pc-windows-msvc/share/doc/rust/html/${baseExamURL}`;
}
function getResultsPath(currentURL) {
  return (
    path.join(outputsPath, path.dirname(currentURL).replaceAll("/", "_")) +
    "-" +
    path
      .basename(currentURL)
      .replace(path.extname(currentURL), "")
      .replaceAll(".", "_")
  );
}
function maxVersion(version1, version2) {
  const version1Parts = version1.split(".").map(Number);
  const version2Parts = version2.split(".").map(Number);
  for (
    let i = 0;
    i < Math.max(version1Parts.length, version2Parts.length);
    i++
  ) {
    const part1 = version1Parts[i] || 0;
    const part2 = version2Parts[i] || 0;
    if (part1 !== part2) return part1 > part2 ? version1 : version2;
  }
  return version1;
}
//#endregion

if (!fs.existsSync(outputsPath)) {
  fs.mkdirSync(outputsPath, { recursive: true });
}

function generateEvolution(baseExamURL, generateVersion, previousURL) {
  const resultsPath = getResultsPath(baseExamURL);
  const examURL = getExamURL(baseExamURL, generateVersion);
  const resultPaths = fs
    .readdirSync(resultsPath)
    .map((f) => {
      if (path.extname(f) !== ".json" || f.startsWith("merged")) return false;
      const obj = JSON.parse(fs.readFileSync(path.join(resultsPath, f)));
      return obj.source_url === examURL && !("changes_info_triples" in obj)
        ? path.join(resultsPath, f)
        : false;
    })
    .filter(Boolean);
  if (resultPaths.length === 0) return;
  const changes_info_relations = previousURL
    ? JSON.parse(fs.readFileSync(previousURL)).changes_info_triples.map(
        (t) => t[1]
      )
    : [];
  try {
    changesAnalyzer.mapTasks(resultPaths, async (path) => {
      await processWithEvolution({
        source_url: path,
        model,
        changes_info_relations,
      });
      mergeChangesInfo(baseExamURL, generateVersion);
    });
  } catch (e) {
    console.error(e);
  }
}

function mergeResults(baseExamURL, mergeVersion, previousURL) {
  //#region merge results
  const currentURL = getExamURL(baseExamURL, mergeVersion);
  const resultsPath = getResultsPath(baseExamURL);
  console.log(`Merging results of ${currentURL}`);
  if (!fs.existsSync(resultsPath))
    fs.mkdirSync(resultsPath, { recursive: true });
  /**
   * @type {{
   * startIndex: number,
   * endIndex: number,
   * merged_triples?: {
   * triples: string[],
   * startIndex: number,
   * endIndex: number,
   * }[],
   * add_triples?: {
   * triples: string[],
   * startIndex: number,
   * endIndex: number,
   * }[],
   * changes_info_triples: [string, string, string][]
   * }[],
   * }
   */
  const results = fs
    .readdirSync(resultsPath)
    .map((f) => {
      if (path.extname(f) !== ".json") return false;
      const obj = JSON.parse(fs.readFileSync(path.join(resultsPath, f)));
      return obj.source_url === currentURL ? obj : undefined;
    })
    .filter(Boolean);
  if (results.length !== maxAnalyzeTimes) {
    console.error(`Results of ${currentURL} not found`);
    return maxAnalyzeTimes - results.length;
  }

  /**
   * @type {{
   * triples: string[],
   * startIndex: number,
   * endIndex: number,
   * }[]}
   */
  let mergedTriples = previousURL
    ? JSON.parse(fs.readFileSync(path.join(resultsPath, previousURL)))
        .merged_triples
    : [];
  for (const result of results) {
    if (!("add_triples" in result)) continue;

    for (const tripleRecord of result.add_triples) {
      const tripleRecords = mergedTriples.filter(
        (t) => t.endIndex > tripleRecord.startIndex
      );
      if (tripleRecords.length > 0) {
        tripleRecords[0].triples = uniqueObjects(
          tripleRecords[0].triples.concat(tripleRecord.triples)
        );
      } else {
        mergedTriples.push({
          triples: uniqueObjects(tripleRecord.triples),
          startIndex: tripleRecord.startIndex,
          endIndex: tripleRecord.endIndex,
        });
      }
    }
  }
  const delete_triples_set = new Set(
    results.reduce((acc, result) => {
      if (!("delete_triples" in result)) return acc;
      return acc.concat(result.delete_triples);
    }, [])
  );
  mergedTriples = mergedTriples.map((tripleRecord) => {
    return {
      triples: tripleRecord.triples.filter(
        (triple) => !delete_triples_set.has(JSON.stringify(triple))
      ),
      startIndex: tripleRecord.startIndex,
      endIndex: tripleRecord.endIndex,
    };
  });
  const changesInfoTriples = uniqueObjects(
    results
      .reduce((acc, result) => acc.concat(result.changes_info_triples), [])
      .filter(Boolean)
  );
  const resultId = `merged_${results[0].id}`;
  const fileName = `${resultId}.json`;
  if (!fs.existsSync(resultsPath)) {
    fs.mkdirSync(resultsPath, { recursive: true });
  }
  fs.writeFileSync(
    path.join(resultsPath, fileName),
    JSON.stringify({
      create_time: new Date().toISOString(),
      id: resultId,
      source_url: currentURL,
      merged_triples: mergedTriples,
      changes_info_triples: changesInfoTriples,
      model,
    })
  );
  return 0;
  //#endregion
}

function mergeChangesInfo(baseExamURL, mergeVersion) {
  //#region merge results
  const currentURL = getExamURL(baseExamURL, mergeVersion);
  const resultsPath = getResultsPath(baseExamURL);
  console.log(`Merging changes info of ${currentURL}`);
  if (!fs.existsSync(resultsPath))
    fs.mkdirSync(resultsPath, { recursive: true });
  /**
   * @type {{
   * startIndex: number,
   * endIndex: number,
   * merged_triples?: {
   * triples: string[],
   * startIndex: number,
   * endIndex: number,
   * }[],
   * add_triples?: {
   * triples: string[],
   * startIndex: number,
   * endIndex: number,
   * }[],
   * changes_info_triples: [string, string, string][]
   * }[],
   * }
   */
  const results = fs
    .readdirSync(resultsPath)
    .map((f) => {
      if (path.extname(f) !== ".json") return false;
      const obj = JSON.parse(fs.readFileSync(path.join(resultsPath, f)));
      return obj.source_url === currentURL ? obj : undefined;
    })
    .filter(Boolean);
  if (results.length !== maxAnalyzeTimes) {
    console.error(`Results of ${currentURL} not found`);
    return maxAnalyzeTimes - results.length;
  }

  const changesInfoTriples = uniqueObjects(
    results
      .reduce((acc, result) => acc.concat(result.changes_info_triples), [])
      .filter(Boolean)
  );
  const resultFile = fs.readdirSync(resultsPath).find((f) => {
    if (path.extname(f) !== ".json" || !f.startsWith("merged")) return false;
    const obj = JSON.parse(fs.readFileSync(path.join(resultsPath, f)));
    return obj.source_url === currentURL && "merged_triples" in obj;
  });
  if (!resultFile) {
    console.error(`Merged result of ${currentURL} not found`);
    return maxAnalyzeTimes - results.length;
  }

  fs.writeFileSync(
    path.join(resultsPath, resultFile),
    JSON.stringify(
      Object.assign(
        {},
        JSON.parse(fs.readFileSync(path.join(resultsPath, resultFile))),
        {
          changes_info_triples: changesInfoTriples,
        }
      )
    )
  );
  return 0;
}

async function processNextVersion(
  previousVersion,
  baseExamURL,
  useDiff = true
) {
  const currentIndex = examVersions.indexOf(previousVersion || "-1") + 1;
  const currentVersion = examVersions[currentIndex];
  const currentURL = getExamURL(baseExamURL, currentVersion);
  const previousExamURL = getExamURL(baseExamURL, previousVersion);
  const resultsPath = getResultsPath(baseExamURL);
  if (currentIndex >= examVersions.length) {
    console.log(`All versions of ${baseExamURL} have been processed`);
    return;
  }
  if (!fs.existsSync(resultsPath))
    fs.mkdirSync(resultsPath, { recursive: true });
  const loadPreviousMergedResultURL = () =>
    fs.readdirSync(resultsPath).find((f) => {
      if (path.extname(f) !== ".json") return false;
      const obj = JSON.parse(fs.readFileSync(path.join(resultsPath, f)));
      return obj.source_url === previousExamURL && "merged_triples" in obj;
    });
  let previousMergedResultURL = loadPreviousMergedResultURL();
  if (!previousMergedResultURL && currentIndex > 0 && useDiff) {
    console.error(`Previous merged result of ${previousExamURL} not found`);
    console.log("Trying to merge results of previous versions");
    if (mergeResults(baseExamURL, previousVersion) > 0) {
      await processNextVersion(examVersions[currentIndex - 2], baseExamURL);
    }
    previousMergedResultURL = loadPreviousMergedResultURL();
  }
  console.log(
    `Processing ${currentURL} (${previousVersion} -> ${currentVersion})`
  );
  const analyzedResultsLength = fs.readdirSync(resultsPath).filter((f) => {
    if (path.extname(f) !== ".json") return false;
    const obj = JSON.parse(fs.readFileSync(path.join(resultsPath, f)));
    return obj.source_url === currentURL;
  }).length;
  if (analyzedResultsLength > 0 && currentIndex > 0 && useDiff) {
    generateEvolution(baseExamURL, currentVersion);
  }

  const analyzeTimes = maxAnalyzeTimes - analyzedResultsLength;
  if (analyzeTimes > 0) {
    const controller = new TaskManager(analyzeTimes);

    //#region process next version
    if (currentIndex === 0 || !useDiff) {
      await controller.mapTasks(analyzeTimes, async () =>
        processWithSplit({
          source_url: currentURL,
          baseUrl: __dirname,
          savePath: resultsPath,
          contextLength,
          windowLength,
          model,
        })
      );
    } else {
      const previousResultURL = path.join(resultsPath, previousMergedResultURL);
      await controller.mapTasks(analyzeTimes, async () =>
        processWithDiff({
          previous_url: previousResultURL,
          target_url: currentURL,
          baseUrl: __dirname,
          savePath: resultsPath,
          contextLength,
          windowLength,
          model,
        })
      );
      generateEvolution(baseExamURL, currentVersion);
    }
    //#endregion
  }

  if (
    !fs
      .readdirSync(resultsPath)
      .find(
        (f) =>
          f.startsWith("merged") &&
          JSON.parse(fs.readFileSync(path.join(resultsPath, f))).source_url ===
            currentURL
      ) &&
    mergeResults(baseExamURL, currentVersion, previousMergedResultURL) !== 0
  ) {
    console.error("Merging failed");
  }

  console.log(`${currentURL} has been processed`);
  examRecords[baseExamURL] = currentVersion;
  fs.writeFileSync(
    path.join(__dirname, "examRecords.json"),
    JSON.stringify(examRecords, null, 2)
  );
  await processNextVersion(currentVersion, baseExamURL);
}

(async function main() {
  let completeTrigger;
  const allComplete = new Promise((resolve) => {
    completeTrigger = resolve;
  });
  changesAnalyzer.addEventListener("taskComplete", completeTrigger);
  // resume from last version for each exam
  const controller = new TaskManager(maxConcurrency);
  await controller.mapTasks(examURLs, async ([baseExamURL, startVersion]) => {
    const lastVersion = maxVersion(
      startVersion,
      examRecords[baseExamURL] || "-1"
    );
    await processNextVersion(
      lastVersion,
      baseExamURL,
      lastVersion !== startVersion
    );
  });
  await allComplete;
  stopSplit();
  stopDiff();
  stopEvolution();
  process.exit(0);
})();
