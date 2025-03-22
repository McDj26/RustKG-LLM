/**
 * @param {string} fileContent
 * @param {number} length
 * @returns {{context: string; content: string}[]}
 */
module.exports = function splitStr(fileContent, length, contextLength = 100) {
  const chunks = [];
  const count = Math.ceil(fileContent.length / length);
  for (let i = 0; i < count; i++) {
    chunks.push({
      context: fileContent.slice(
        Math.max(0, i * length - contextLength),
        i * length
      ),
      content: fileContent.slice(i * length, (i + 1) * length),
    });
  }
  return chunks;
};
