const diff = require("diff");

/**
 * @param {string} oldStr
 * @param {string} newStr
 * @returns {(diff.Change & {length: number; startIndexOld: number; startIndexNew: number;})[]}
 */
exports.charDiff = (oldStr, newStr) =>
  diff.diffChars(oldStr, newStr).reduce((prev, curr) => {
    const len = prev.length;
    if (len === 0) {
      prev.push({
        ...curr,
        length: curr.value.length,
        startIndexOld: 0,
        startIndexNew: 0,
      });
    } else {
      prev.push({
        ...curr,
        length: curr.value.length,
        startIndexOld:
          prev[len - 1].startIndexOld +
          (prev[len - 1].added ? 0 : prev[len - 1].length),
        startIndexNew:
          prev[len - 1].startIndexNew +
          (prev[len - 1].removed ? 0 : prev[len - 1].length),
      });
    }
    return prev;
  }, []);

/**
 * @param {string} oldStr
 * @param {string} newStr
 * @returns {(diff.Change & {length: number; startIndexOld: number; startIndexNew: number;})[]}
 */
exports.wordDiff = (oldStr, newStr) =>
  diff.diffWordsWithSpace(oldStr, newStr).reduce((prev, curr) => {
    const len = prev.length;
    if (len === 0) {
      prev.push({
        ...curr,
        length: curr.value.length,
        startIndexOld: 0,
        startIndexNew: 0,
      });
    } else {
      prev.push({
        ...curr,
        length: curr.value.length,
        startIndexOld:
          prev[len - 1].startIndexOld +
          (prev[len - 1].added ? 0 : prev[len - 1].length),
        startIndexNew:
          prev[len - 1].startIndexNew +
          (prev[len - 1].removed ? 0 : prev[len - 1].length),
      });
    }
    return prev;
  }, []);

/**
 * @param {string} oldStr
 * @param {string} newStr
 * @returns {(diff.Change & {length: number; startIndexOld: number; startIndexNew: number;})[]}
 */
exports.lineDiff = (oldStr, newStr) =>
  diff.diffLines(oldStr, newStr).reduce((prev, curr) => {
    const len = prev.length;
    if (len === 0) {
      prev.push({
        ...curr,
        length: curr.value.length,
        startIndexOld: 0,
        startIndexNew: 0,
      });
    } else {
      prev.push({
        ...curr,
        length: curr.value.length,
        startIndexOld:
          prev[len - 1].startIndexOld +
          (prev[len - 1].added ? 0 : prev[len - 1].length),
        startIndexNew:
          prev[len - 1].startIndexNew +
          (prev[len - 1].removed ? 0 : prev[len - 1].length),
      });
    }
    return prev;
  }, []);
