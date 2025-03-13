const fs = require("fs").promises;
const path = require("path");
const dirPath = path.resolve(__dirname, "../output/deepseek-r1-250120");
const targetUrl =
  "file:///C:/Users/Dj/.rustup/toolchains/1.30-x86_64-pc-windows-msvc/share/doc/rust/html/std/iter/trait.Iterator.html";
console.log(dirPath);

fs.readdir(dirPath)
  .then((files) => {
    const promises = files.map((file) => {
      const filePath = path.join(dirPath, file);
      return fs
        .readFile(filePath)
        .then((data) => {
          const jsonData = JSON.parse(data);
          console.log(jsonData.source_url);

          return jsonData.source_url === targetUrl ? jsonData.id : null;
        })
        .catch((error) => null);
    });

    return Promise.all(promises).then((results) =>
      results.filter((item) => item !== null)
    );
  })
  .then((results) => console.log(results))
  .catch((error) => console.error(error));
