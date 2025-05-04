const fs = require("fs");
const path = require("path");
const uniqueObjects = require("../../../utils/uniqueObjects.js");
const { getNameMapping, specialConvert, specialSet } = require("./alias.js");

const relative_path = "../effective/output/one-shot-with-rules";
const searchDir = path.join(__dirname, relative_path);
const outputDir = path.join(
  __dirname,
  "output",
  relative_path.split("/").pop() || "."
);
// 特殊关系集合，附加版本信息时不处理客体
const escapeRelations = new Set([
  "has full name",
  "has short name",
  "has alias",
  "has alias name",
  "is a",
  "has description",
  "has example",
  "has source code",
  "stable since",
]);

/**
 * 预处理函数：
 * 将所有名单内的关系所在的三元组进行预处理，将所有别名转换为标准名称
 * @param {[string, string, string][]} triples
 * @param {[string, string, string][]} extraTriples
 */
function preProcess(triples, extraTriples = []) {
  const nameMapping = triples
    .map(getNameMapping)
    .filter((item) => item.full_name !== null);
  /** @type {Map<string, string>} */
  const nameMap = new Map();
  nameMapping.forEach((item) => {
    if (!nameMap.has(item.alias)) {
      nameMap.set(item.alias, item.full_name);
    }
  });
  const convertTriples = (triple) => {
    const [subject, predicate, object] = triple;
    return specialSet.has(predicate)
      ? triple
      : [
          nameMap.has(subject) ? nameMap.get(subject) : subject,
          predicate,
          nameMap.has(object) ? nameMap.get(object) : object,
        ];
  };
  return {
    triples: triples.map(convertTriples).map(specialConvert),
    extraTriples: extraTriples.map(convertTriples).map(specialConvert),
  };
}

/**
 * 为三元组附加版本信息
 * @param {[string, string, string][]} triples
 * @param {string} version
 * @param {string | undefined} targetVersion
 * @returns {[string, string, string][]}
 */
function appendVersion(triples, version, targetVersion) {
  return targetVersion
    ? triples.map((item) => {
        const [subject, predicate, object] = item;
        if (escapeRelations.has(predicate)) {
          return [`${subject}:${version}`, predicate, object];
        }
        return [
          `${subject}:${version}`,
          predicate,
          `${object}:${targetVersion}`,
        ];
      })
    : triples.map((item) => {
        const [subject, predicate, object] = item;
        if (escapeRelations.has(predicate)) {
          return [`${subject}:${version}`, predicate, object];
        }
        return [`${subject}:${version}`, predicate, `${object}:${version}`];
      });
}

/**
 * 跨版本融合：
 * 1. 首先将每个版本的实体id映射为A:version的形式（名称保持不变）
 * 2. 然后将演化关系的实体按照特定的规则附加版本信息，一般可以直接映射为 [A:prev, R, B:new]）
 * 对于一些特殊的演化关系，需要确保对应的实体与正确的版本的关系链接（如文档在后续版本中补充的内容，但实际上在旧版本中已经生效）
 * 3. 最后融合到同一张表中
 * @param {{triples: [string, string, string][]; version: string}[]} baseTriples
 * @param {{triples: [string, string, string][]; sourceVersion: string; targetVersion: string}[]} changeTriples
 * @returns {[string, string, string][][]}
 */
function mergeSingleAPI(baseTriples, changeTriples) {
  return baseTriples.map((tripleRecord, index) => {
    const { version } = tripleRecord;
    const { sourceVersion, targetVersion } = changeTriples[index];
    let { triples, extraTriples } = preProcess(
      tripleRecord.triples,
      changeTriples[index].triples
    );
    triples = appendVersion(triples, version);
    extraTriples = appendVersion(extraTriples, sourceVersion, targetVersion);
    triples = uniqueObjects(triples.concat(extraTriples));
    return triples;
  });
}

/**
 * 横向融合：
 * 融合时每个文档建立一个实体集，如果在融合两个文档时实体集存在交集，且交集的实体在不同的文档中有不同的别名，则计入失败结果中
 * @param {[string, string, string][][]} independentTriples
 * @returns {{mergedTriples: [string, string, string][], mergeFailed: [string, string, string][], mergedNameMap: [string, string][]}}
 */
function mergeAllAPI(independentTriples) {
  /** @type {Set<string>[]} */
  const entitySets = independentTriples.map(
    (triples) =>
      new Set(
        triples.reduce((acc, triple) => acc.concat([triple[0], triple[2]]), [])
      )
  );
  const mergeFailed = [];
  const currentSet = entitySets[independentTriples.length - 1];
  const mergedTriples = independentTriples[independentTriples.length - 1];
  const mergedNameMap = new Map(
    mergedTriples
      .map(getNameMapping)
      .filter((item) => item.full_name !== null)
      .map(({ full_name, alias }) => [full_name, alias])
  );
  for (let index = independentTriples.length - 1; index > 0; index--) {
    const prevTriples = independentTriples[index - 1];
    const prevSet = entitySets[index - 1];
    const prevNameMap = new Map(
      prevTriples
        .map(getNameMapping)
        .filter((item) => item.full_name !== null && item.alias !== null)
        .map(({ full_name, alias }) => [full_name, alias])
    );
    const intersection = new Set(
      [...prevSet].filter((item) => currentSet.has(item))
    );
    for (const triple of prevTriples) {
      if (
        intersection.has(triple[0]) &&
        prevNameMap.has(triple[0]) &&
        mergedNameMap.has(triple[0]) &&
        prevNameMap.get(triple[0]) !== mergedNameMap.get(triple[0])
      ) {
        // 两个文档对相同的实体有不同的别名
        mergeFailed.push(triple);
      } else if (
        intersection.has(triple[2]) &&
        prevNameMap.has(triple[2]) &&
        mergedNameMap.has(triple[2]) &&
        prevNameMap.get(triple[2]) !== mergedNameMap.get(triple[2])
      ) {
        // 两个文档对相同的实体有不同的别名
        mergeFailed.push(triple);
      } else {
        mergedTriples.push(triple);
        // 更新当前版本的名称映射
        if (prevNameMap.has(triple[0]) && !mergedNameMap.has(triple[0])) {
          mergedNameMap.set(triple[0], prevNameMap.get(triple[0]));
        }
        if (prevNameMap.has(triple[2]) && !mergedNameMap.has(triple[2])) {
          mergedNameMap.set(triple[2], prevNameMap.get(triple[2]));
        }
      }
    }
  }
  return {
    mergedTriples,
    mergeFailed,
    mergedNameMap: Array.from(mergedNameMap),
  };
}

/**
 * 递归地搜索目录，遇到以"merge"开头、以".json"结尾的文件时加入到待融合列表中
 * @param {string} rootDir
 * @returns {string[]}
 */
function searchFiles(rootDir) {
  const files = fs.readdirSync(rootDir);
  const result = [];
  for (const file of files) {
    const filePath = path.join(rootDir, file);
    if (fs.statSync(filePath).isDirectory()) {
      result.push(...searchFiles(filePath));
    } else if (file.startsWith("merged") && file.endsWith(".json")) {
      result.push(filePath);
    }
  }
  return result;
}

const previousVersion = require("../effective/examVersions.json").reduce(
  (acc, item, index, array) => ({
    ...acc,
    [item.version]: array[index - 1],
  }),
  {}
);

(async function main() {
  const files = searchFiles(searchDir);
  const jsons = files.map((file) => JSON.parse(fs.readFileSync(file)));
  /** @type {{triples: [string, string, string][], version: string}} */
  const baseTriples = jsons.map((json) => {
    return {
      triples: json.merged_triples.reduce((acc, triples) => {
        return acc.concat(triples.triples);
      }, []),
      version: json.source_url
        .replace("file:///C:/Users/Dj/.rustup/toolchains/", "")
        .replace(/-x86_64-pc-windows-msvc.*/gi, ""),
    };
  });
  /** @type {{triples: [string, string, string][]; sourceVersion: string; targetVersion: string}[]} */
  const changeTriples = jsons
    .map((json) => {
      const version = json.source_url
        .replace("file:///C:/Users/Dj/.rustup/toolchains/", "")
        .replace(/-x86_64-pc-windows-msvc.*/gi, "");
      return {
        triples: json.changes_info_triples || [],
        sourceVersion: previousVersion[version],
        targetVersion: version,
      };
    })
    .filter(Boolean);
  const result = mergeAllAPI(mergeSingleAPI(baseTriples, changeTriples));
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(outputDir, "merged_triples.json"),
    JSON.stringify(result, null, 2)
  );
  console.log("Relation triples merged successfully.");
  console.log(
    "Length of result triples: ",
    Object.entries(result).map(([key, value]) => ({ [key]: value.length }))
  );
})();
