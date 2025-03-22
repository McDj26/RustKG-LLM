const diffProcessor = require("./diffMethods");

/**
 * @param {string} oldStr
 * @param {string} newStr
 * @param {number} contextLength
 * @param {number} windowLength
 * @param {"char" | "word" | "line"} method
 * @returns {{oldContext: string; newContext: string; oldStr: string; newStr: string; limitExceed: boolean}[]}
 */
function split2DiffChunks(
  oldStr,
  newStr,
  contextLength,
  windowLength,
  method = "word"
) {
  const diffResult = diffProcessor[`${method}Diff`](oldStr, newStr);
  const chunks = [];
  const len = diffResult.length;
  let chunksType = [];
  let startIndexNew = 0;
  let startIndexOld = 0;
  let sizeCountOld = 0;
  let sizeCountNew = 0;
  let limitExceed = false;
  let chunk = null;
  for (let i = 0; i < len; i++) {
    chunk = diffResult[i];
    // 遇到变更块
    if (chunk.added) {
      sizeCountNew += chunk.length;
      chunksType.push("added");
    } else if (chunk.removed) {
      sizeCountOld += chunk.length;
      chunksType.push("removed");
    } else if (chunksType.length !== 0) {
      // 前面加入了变更块
      sizeCountOld += chunk.length;
      sizeCountNew += chunk.length;
      chunksType.push("same");
    } else {
      // 没有变更块，直接跳过
      startIndexNew = chunk.startIndexNew + chunk.length;
      startIndexOld = chunk.startIndexOld + chunk.length;
    }
    // 判断是否超限
    if (sizeCountOld > windowLength || sizeCountNew > windowLength) {
      if (chunksType.length === 1) {
        // 只加入了一个变更块就超限
        console.warn(
          "Cannot obey forwardContextLength restriction since diff block is larger than forwardContextLength"
        );
        if (
          i + 1 < len &&
          ((diffResult[i + 1].added &&
            diffResult[i + 1].length + sizeCountNew <= windowLength) ||
            (diffResult[i + 1].removed &&
              diffResult[i + 1].length + sizeCountOld <= windowLength))
        ) {
          if (diffResult[i + 1].added) {
            sizeCountNew += diffResult[i + 1].length;
            chunksType.push("added");
          } else {
            sizeCountOld += diffResult[i + 1].length;
            chunksType.push("removed");
          }
          i++;
        }
        limitExceed = true;
      } else if (method === "char") {
        // 对于字符对比，可以直接截取
        const exceedSize = Math.max(sizeCountOld, sizeCountNew) - windowLength;
        sizeCountOld -= exceedSize;
        sizeCountNew -= exceedSize;
        i--;
      } else {
        // 对于单词/行对比，需要向前回溯
        if (chunksType[chunksType.length - 1] === "added") {
          sizeCountNew -= chunk.length;
        } else if (chunksType[chunksType.length - 1] === "removed") {
          sizeCountOld -= chunk.length;
        } else {
          // 对于same，直接截取
          let exceedSize = Math.max(sizeCountOld, sizeCountNew) - windowLength;
          if (chunk.length > contextLength) {
            // 避免same块过大
            exceedSize = Math.max(exceedSize, chunk.length - contextLength);
          }
          sizeCountOld -= exceedSize;
          sizeCountNew -= exceedSize;
        }
        i--;
      }
      const contextOldStartIndex =
        startIndexOld - contextLength < 0 ? 0 : startIndexOld - contextLength;
      const contextNewStartIndex =
        startIndexNew - contextLength < 0 ? 0 : startIndexNew - contextLength;
      chunks.push({
        oldContext: oldStr.slice(contextOldStartIndex, startIndexOld),
        oldStr: oldStr.slice(startIndexOld, startIndexOld + sizeCountOld),
        newContext: newStr.slice(contextNewStartIndex, startIndexNew),
        newStr: newStr.slice(startIndexNew, startIndexNew + sizeCountNew),
        limitExceed,
      });
      limitExceed = false;
      startIndexNew =
        diffResult[i].startIndexNew +
        (diffResult[i].added ? diffResult[i].length : 0);
      startIndexOld =
        diffResult[i].startIndexOld +
        (diffResult[i].removed ? diffResult[i].length : 0);
      sizeCountOld = 0;
      sizeCountNew = 0;
      chunksType = [];
    }
  }
  if (chunksType.length > 0) {
    // 最后一个变更块
    if (chunksType[chunksType.length - 1] === "same") {
      // 对于same，直接截取
      let exceedSize = Math.max(sizeCountOld, sizeCountNew) - windowLength;
      if (chunk.length > contextLength) {
        // 避免same块过大
        exceedSize = Math.max(exceedSize, chunk.length - contextLength);
      }
      sizeCountOld -= exceedSize;
      sizeCountNew -= exceedSize;
    }
    const contextOldStartIndex =
      startIndexOld - contextLength < 0 ? 0 : startIndexOld - contextLength;
    const contextNewStartIndex =
      startIndexNew - contextLength < 0 ? 0 : startIndexNew - contextLength;
    chunks.push({
      oldContext: oldStr.slice(contextOldStartIndex, startIndexOld),
      oldStr: oldStr.slice(startIndexOld, startIndexOld + sizeCountOld),
      newContext: newStr.slice(contextNewStartIndex, startIndexNew),
      newStr: newStr.slice(startIndexNew, startIndexNew + sizeCountNew),
      limitExceed,
    });
  }
  return chunks;
}

module.exports = split2DiffChunks;
