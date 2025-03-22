const fs = require("fs");
const path = require("path");

function readJsonAndPrintSet(filePath) {
  // Read file
  const rawData = fs.readFileSync(filePath, "utf-8");
  // Parse JSON data
  const data = JSON.parse(rawData);
  // Initialize a set to store unique values
  const resultSet = new Set();

  // Iterate over each array in the 2D array
  data.forEach((array) => {
    if (Array.isArray(array) && array.length > 1) {
      // Add the element at index 1 to the set
      resultSet.add(array[1]);
    }
  });

  // Save the set to a file
  const outputFilePath = path.join(__dirname, "unique_values.json");
  fs.writeFileSync(
    outputFilePath,
    JSON.stringify(Array.from(resultSet), null, 2)
  );
}

// Example usage
const filePath = path.join(
  __dirname,
  "../../exams/full/output/deepseek-r1-250120/merged_relation_triples.json"
);
readJsonAndPrintSet(filePath);
