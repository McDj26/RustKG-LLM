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
  const chunksType = [];
  for (let i = 0; i < len; i++) {
    if (diffResult[i].added || diffResult[i].removed) {
      // 向前/后扩展窗口
      // 向后扩展时默认认为前面的差异已被处理，因此直接减去contextLength得到startIndexOld/startIndexNew
      let startIndexNew = diffResult[i].startIndexNew - contextLength;
      let startIndexOld = diffResult[i].startIndexOld - contextLength;
      startIndexNew = startIndexNew < 0 ? 0 : startIndexNew;
      startIndexOld = startIndexOld < 0 ? 0 : startIndexOld;
      // 向前扩展
      let forwardIndex = i;
      let sizeCountOld = 0;
      let sizeCountNew = 0;
      let limitExceed = false;
      while (
        forwardIndex < len &&
        sizeCountOld <= windowLength &&
        sizeCountNew <= windowLength
      ) {
        const result = diffResult[forwardIndex];
        if (result.added) {
          sizeCountNew += result.length;
          chunksType.push("added");
        } else if (result.removed) {
          sizeCountOld += result.length;
          chunksType.push("removed");
        } else {
          sizeCountOld += result.length;
          sizeCountNew += result.length;
          chunksType.push("same");
        }
        forwardIndex++;
      }
      if (sizeCountOld > windowLength || sizeCountNew > windowLength) {
        if (forwardIndex === i + 1) {
          console.warn(
            "Cannot obey forwardContextLength restriction since diff block is larger than forwardContextLength"
          );
          limitExceed = true;
          // 如果已经超限，且另一个未超限，则继续扩展
          if (
            forwardIndex < len &&
            chunksType[chunksType.length - 1] === "same" &&
            ((diffResult[forwardIndex].added && sizeCountNew < windowLength) ||
              (diffResult[forwardIndex].removed && sizeCountOld < windowLength))
          ) {
            const oldSizePatch = diffResult[forwardIndex].added
              ? 0
              : diffResult[forwardIndex].length;
            const newSizePatch = diffResult[forwardIndex].removed
              ? 0
              : diffResult[forwardIndex].length;
            sizeCountOld += oldSizePatch;
            sizeCountNew += newSizePatch;
            forwardIndex++;
          }
        } else if (method === "char") {
          // 对于字符对比，可以直接截取
          const exceedSize =
            Math.max(sizeCountOld, sizeCountNew) - windowLength;
          sizeCountOld -= exceedSize;
          sizeCountNew -= exceedSize;
          forwardIndex--;
        } else {
          // 对于单词/行对比，需要向前回溯
          const oldSizePatch = diffResult[forwardIndex - 1].added
            ? 0
            : diffResult[forwardIndex - 1].length;
          const newSizePatch = diffResult[forwardIndex - 1].removed
            ? 0
            : diffResult[forwardIndex - 1].length;
          sizeCountOld -= oldSizePatch;
          sizeCountNew -= newSizePatch;
          forwardIndex--;
        }
      }
      chunks.push({
        oldContext: oldStr.slice(startIndexOld, diffResult[i].startIndexOld),
        oldStr: oldStr.slice(
          diffResult[i].startIndexOld,
          diffResult[i].startIndexOld + sizeCountOld
        ),
        newContext: newStr.slice(startIndexNew, diffResult[i].startIndexNew),
        newStr: newStr.slice(
          diffResult[i].startIndexNew,
          diffResult[i].startIndexNew + sizeCountNew
        ),
        limitExceed,
      });
      i = forwardIndex - 1;
    }
  }
  return chunks;
}

module.exports = split2DiffChunks;
