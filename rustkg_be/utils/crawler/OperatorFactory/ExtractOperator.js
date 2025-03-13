const cheerio = require("cheerio");

/**
 * @type {{[key: string]: (args: any[]) => (data: any) => any}}
 */
module.exports = {
  split: (args) => (data) =>
    Array.isArray(data)
      ? data.map((item) => item.split(args[0]))
      : typeof data === "string"
      ? data.split(args[0])
      : data,
  replace: (args) => {
    const regExp = new RegExp(args[0], args[2]);
    return (data) =>
      Array.isArray(data)
        ? data.map((item) => item.replaceAll(regExp, args[1]))
        : typeof data === "string"
        ? data.replace(regExp, args[1])
        : data;
  },
  trim: () => (data) =>
    Array.isArray(data)
      ? data.map((item) => item.trim())
      : typeof data === "string"
      ? data.trim()
      : data,
  toLowerCase: () => (data) =>
    Array.isArray(data)
      ? data.map((item) => item.toLowerCase())
      : typeof data === "string"
      ? data.toLowerCase()
      : data,
  join: (args) => (data) => Array.isArray(data) ? data.join(args[0]) : data,
  default: (args) => (data) => data === undefined ? args[0] : data,
  index: (args) => (data) =>
    data instanceof Object
      ? args.reduce((val, arg) => {
          Number.isInteger(arg) &&
            Array.isArray(val) &&
            (arg = arg < 0 ? val.length + arg : arg);
          return val[arg];
        }, data)
      : data,
  execute: (args) => (data) => data[args[0]]?.apply(data, args.slice(1)),
  removeIfEmpty: () => {
    const validator = (val) => {
      if (Array.isArray(val)) return val.length > 0 ? val : undefined;
      else if (typeof val === "string") return val.length > 0 ? val : undefined;
      else if (val instanceof Object) {
        const keys = Object.keys(val);
        if (keys.length > 0) {
          for (const k of keys) {
            if ((val[k] = validator(val[k])) !== undefined) return val;
          }
          return undefined;
        } else return undefined;
      } else return val;
    };
    return validator;
  },
  parseHTML: () => (data) => cheerio.load(data),
  querySelectorAll: (args) => (data) => {
    return "elements" in data
      ? { elements: data.$(args[0]), $: data.$ }
      : { elements: data(args[0]), $: data };
  },
  getElementAttribute:
    (args) =>
    ({ elements }) =>
      elements.prop(args[0]),
  removeElements: (args) => (data) => {
    const $ = "$" in data ? data.$ : data;
    $(args[0]).remove();
    return $;
  },
  firstElement:
    () =>
    ({ elements, $ }) => ({ elements: elements.first(), $ }),
  findElements: (args) => (data) =>
    "elements" in data
      ? { elements: data.elements.find(args[0]), $: data.$ }
      : { elements: data(args[0]), $: data },
  childrenElements:
    (args) =>
    ({ elements, $ }) => ({ elements: elements.children(args?.[0]), $ }),
  nextElements:
    () =>
    ({ elements, $ }) => ({ elements: elements.next(), $ }),
  nextAllElements:
    () =>
    ({ elements, $ }) => ({ elements: elements.nextAll(), $ }),
  prevElementsUntil:
    (args) =>
    ({ elements, $ }) => ({ elements: elements.prevUntil(args[0]), $ }),
  nextElementsUntil:
    (args) =>
    ({ elements, $ }) => ({ elements: elements.nextUntil(args[0]), $ }),
  filterElements:
    (args) =>
    ({ elements, $ }) => ({ elements: elements.filter(args[0]), $ }),
  extractElementsText: () => (data) =>
    "elements" in data
      ? data.elements.map((_, el) => data.$(el).text()).get()
      : data.text(),
  trueIfExist: () => (data) =>
    "elements" in data ? data.elements.length > 0 : Boolean(data),
  pruneIfEmpty: () => (data) =>
    data === undefined || data === null
      ? { EndOfProcess: true, val: undefined }
      : data,
};
