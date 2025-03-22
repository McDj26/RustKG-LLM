const fs = require("fs");
const path = require("path");

const dir =
  "D:\\Lessons\\projects\\rustKG\\rustkg_be\\sandbox\\exams\\full\\output\\deepseek-r1-250120";
const fileNames = [
  "72cf6abf-90b7-41f4-84d7-1df3db02ec9b",
  "95bd1743-08b1-43e6-92b1-3900111bf7f2",
  "df75229b-e187-45c2-bb8a-1267e99a89da",
  "5eedf474-b932-4479-82d1-1a1b37031611",
  "5fa947a3-279e-4e7d-8abb-a5323d321ee4",
  "650ea408-276b-4730-8f38-fc2049966768",
]; // replace with your file names

fileNames.forEach((fileName) => {
  const filePath = path.join(dir, `${fileName}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath, (err) => {
      if (err) {
        console.error(`Error deleting file ${fileName}:`, err);
      } else {
        console.log(`Successfully deleted file ${fileName}`);
      }
    });
  } else {
    console.log(`File ${fileName} does not exist`);
  }
});
