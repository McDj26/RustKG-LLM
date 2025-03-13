export default function downloadObjJSON(obj: any, filename: string) {
  const json = JSON.stringify(obj, null, 2);
  const blob = new Blob([json], { type: "application/json" }); //application/json

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click(); //触发下载
  window.URL.revokeObjectURL(url);
}
