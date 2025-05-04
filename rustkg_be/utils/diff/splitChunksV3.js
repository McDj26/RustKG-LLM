const diffProcessor = require("./diffMethods");

/**
 * @param {{chunk_type: string; chunk_content: string; cumulative_length: number}[]} chunks
 * @param {number} contextLength
 * @param {number} signLength
 * @returns {void}
 */
function processNewChunk(chunks, contextLength, signLength) {
  const len = chunks.length;
  if (len === 0) return;
  const lastChunk = chunks[len - 1];
  const previousChunk =
    len !== 1
      ? chunks[len - 2]
      : { chunk_type: "", chunk_content: "", cumulative_length: 0 };
  if (
    lastChunk.chunk_type !== "unmodified" &&
    previousChunk.chunk_type === "unmodified"
  ) {
    if (len === 2) {
      // [unmodified, added/removed]
      previousChunk.cumulative_length = Math.min(
        contextLength,
        previousChunk.chunk_content.length
      );
    } else {
      // [..., added/removed, unmodified, added/removed]
      const ppreviousCumulativeLength = chunks[len - 3].cumulative_length;
      previousChunk.cumulative_length =
        ppreviousCumulativeLength +
        Math.min(
          contextLength * 2 + signLength,
          previousChunk.chunk_content.length
        );
    }
  }
  lastChunk.cumulative_length =
    previousChunk.cumulative_length + lastChunk.chunk_content.length;
}

/**
 * @param {{chunk_type: string; chunk_content: string; cumulative_length: number}[]} chunks
 * @param {number} contextLength
 * @param {string} unmodifiedSign
 * @returns {string}
 */
function finalProcess(chunks, contextLength, unmodifiedSign) {
  const signLength = unmodifiedSign.length + 2;
  return chunks
    .reduce((prev, curr, index) => {
      const chunkContent = curr.chunk_content;
      const chunkSize = chunkContent.length;
      if (curr.chunk_type === "unmodified") {
        if (index === 0) {
          prev.push(chunkContent.slice(chunkSize - contextLength));
        } else if (index === chunks.length - 1) {
          prev.push(chunkContent.slice(0, contextLength));
        } else {
          if (chunkSize > contextLength * 2 + signLength) {
            prev.push(
              [
                chunkContent.slice(0, contextLength),
                unmodifiedSign,
                chunkContent.slice(chunkSize - contextLength),
              ].join("\n")
            );
          } else {
            prev.push(chunkContent);
          }
        }
      } else {
        prev.push(chunkContent);
      }
      return prev;
    }, [])
    .join("\n");
}

/**
 * @param {string} oldStr
 * @param {string} newStr
 * @param {number} contextLength
 * @param {number} windowLength
 * @param {"char" | "word" | "line"} method
 * @param {string} unmodifiedSign
 * @returns {{str: string; limitExceed: boolean; startIndex: number}[]}
 */
function split2DiffChunks(
  oldStr,
  newStr,
  contextLength,
  windowLength,
  method = "word",
  unmodifiedSign = "<!--unmodified-->"
) {
  const diffResult = diffProcessor[`${method}Diff`](oldStr, newStr);
  const chunks = [];
  const len = diffResult.length;
  const signLength = unmodifiedSign.length + 2;
  let limitExceed = false;
  let processingChunks = [];
  let startIndex = 0;
  for (let i = 0; i < len; i++) {
    const chunk = diffResult[i];
    // 遇到变更块
    if (chunk.added) {
      processingChunks.push({
        chunk_type: "added",
        chunk_content: `<newText>${chunk.value}</newText>`,
        cumulative_length: 0,
      });
    } else if (chunk.removed) {
      processingChunks.push({
        chunk_type: "removed",
        chunk_content: `<oldText>${chunk.value}</oldText>`,
        cumulative_length: 0,
      });
      startIndex += chunk.value.length;
    } else {
      // 遇到不变块
      processingChunks.push({
        chunk_type: "unmodified",
        chunk_content: chunk.value,
        cumulative_length: 0,
      });
      startIndex += chunk.value.length;
    }
    processNewChunk(processingChunks, contextLength, signLength);
    const cumulativeLength =
      processingChunks[processingChunks.length - 1].cumulative_length;
    // 判断是否超限
    if (cumulativeLength > windowLength) {
      if (processingChunks.length === 1) {
        // 只加入了一个变更块就超限
        console.warn(
          "Cannot obey forwardContextLength restriction since diff block is larger than forwardContextLength"
        );
        limitExceed = true;
      } else if (method === "char") {
        // 对于字符对比 + 不变内容，可以直接截断
        const exceedSize = cumulativeLength - windowLength;
        const lastChunk = processingChunks[processingChunks.length - 1];
        lastChunk.chunk_content = lastChunk.chunk_content.slice(
          0,
          lastChunk.chunk_content.length - exceedSize
        );
        i--;
      } else {
        const lastChunk = processingChunks[processingChunks.length - 1];
        if (lastChunk.chunk_type !== "unmodified") {
          // 对于单词/行对比，需要向前回溯
          processingChunks.pop();
          i--;
        } else {
          // 对于same，直接截断
          const exceedSize = cumulativeLength - windowLength;
          lastChunk.chunk_content = lastChunk.chunk_content.slice(
            0,
            lastChunk.chunk_content.length - exceedSize
          );
        }
      }
      chunks.push({
        str: finalProcess(processingChunks, contextLength, unmodifiedSign),
        limitExceed,
        startIndex,
      });

      limitExceed = false;
      processingChunks = [];
    }
  }
  if (processingChunks.length > 0) {
    chunks.push({
      str: finalProcess(processingChunks, contextLength, unmodifiedSign),
      limitExceed,
      startIndex,
    });
  }
  return chunks;
}

module.exports = split2DiffChunks;
