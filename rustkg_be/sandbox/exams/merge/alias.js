/**
 * @type {{[string]: (triple: [string, string, string]) => {full_name: string, alias: string}}}
 * @description 该函数用于将三元组中的别名转换为标准名称
 */
const extractNameMap = {
  "has full name": (triple) => ({ full_name: triple[2], alias: triple[0] }),
  "has short name": (triple) => ({ full_name: triple[0], alias: triple[2] }),
  "has alias": (triple) => ({ full_name: triple[0], alias: triple[2] }),
  "has alias name": (triple) => ({ full_name: triple[0], alias: triple[2] }),
};

const specialSet = new Set(Object.keys(extractNameMap));

/**
 * @param {[string, string, string]} triple
 * @returns {[string, string, string]}
 */
function specialConvert(triple) {
  if (triple[1] === "has full name") {
    return [triple[2], "has alias", triple[0]];
  }
  return triple;
}

/**
 * @param {[string, string, string]} triple
 * @returns {{full_name: string, alias: string} | {full_name: null, alias: null}}
 */
function getNameMapping(triple) {
  if (specialSet.has(triple[1])) {
    return extractNameMap[triple[1]](triple);
  } else {
    return { full_name: null, alias: null };
  }
}

module.exports = {
  getNameMapping,
  specialConvert,
  specialSet,
};
