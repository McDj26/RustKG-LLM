module.exports = {
  prefix: (args) => {
    const prefix = args.join("");
    return (val) =>
      Array.isArray(val) ? val.map((item) => prefix + item) : `${prefix}${val}`;
  },
  trueIfAbsent: (args) => () => args[0] ? undefined : true,
  pruneIfEmpty: () => (data) =>
    data === undefined || data === null
      ? { EndOfProcess: true, val: undefined }
      : data,
};
