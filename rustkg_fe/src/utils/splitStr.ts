export function splitStr(src: string, interval: number, splitStr = "\n") {
  const arr = [];
  let start = 0;
  src = src.replace(new RegExp(splitStr, "g"), " ");
  while (start < src.length) {
    const end = start + interval;
    arr.push(src.slice(start, end));
    start = end;
  }
  return arr.join(splitStr);
}

export function cutStr(src: string, maxLength: number) {
  if (src.length > maxLength) {
    src = src.slice(0, maxLength - 3) + "...";
  }
  return src;
}
