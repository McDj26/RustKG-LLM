const visit = (obj, path) => {
  let current = obj;
  for (const k of path) {
    if (!(k in current)) current[k] = {};
    current = current[k];
  }
  current["__not_exist__"] = true;
};

const comp = (pattern, target, diff, path) => {
  if (pattern instanceof Object && target instanceof Object) {
    const keys = Object.keys(pattern);
    for (const k of keys) {
      path.push(k);
      if (!(k in target) || typeof pattern[k] !== typeof target[k])
        visit(diff, path);
      if (pattern[k] instanceof Object) comp(pattern[k], target[k], diff, path);
      path.pop();
    }
  }
};

const handler = async (ctx, next) => {
  const { require: requireStructure, current: currentStructure } =
    ctx.request.body;
  try {
    const diff = {};
    comp(requireStructure, currentStructure, diff, []);
    ctx.status = 200;
    ctx.body = { diff };
  } catch (e) {
    console.error(e);
    ctx.status = 400;
    ctx.body = e.message;
  }
};

module.exports = ["/compare", handler];
