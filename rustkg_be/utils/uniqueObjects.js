/**
 * @param {Array} arr
 * @returns {Array}
 */
module.exports = function uniqueObjects(arr) {
  const s = new Set();
  return arr.filter((a) => {
    if (s.has(JSON.stringify(a))) return false;
    s.add(JSON.stringify(a));
    return true;
  });
};
