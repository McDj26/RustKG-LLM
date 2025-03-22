require("dotenv").config();
const path = require("path");
const fs = require("fs");
const TaskManager = require("../utils/TaskManager");
const controller = new TaskManager();
const model = process.env.LLM_MODEL;
const model_output_path = path.join(__dirname, "../output", model || "");
const URLBlacklist = require("./llm_extraction/URLBlackList");
const failed = new Set(require("../assets/failed.json").map((i) => i.url));

async function handler(ctx, next) {
  try {
    const visited = new Set();
    let links = [];
    const dirs = await fs.promises.readdir(model_output_path);
    await controller.mapTasks(dirs, async (dir) => {
      const file_path = path.join(model_output_path, dir);
      const { source_url, links: l } = JSON.parse(
        await fs.promises.readFile(file_path)
      );
      visited.add(source_url);
      links = links.concat(l.map((link) => new URL(link, source_url).href));
    });
    const filteredUrls = links.filter((url) => {
      for (let regExp of URLBlacklist) {
        if (regExp.test(url)) {
          return false;
        }
      }
      return !visited.has(url) && !failed.has(url);
    });

    await fs.promises.writeFile(
      path.join(__dirname, "../assets/visited.json"),
      JSON.stringify(Array.from(visited))
    );
    ctx.status = 200;
    ctx.body = JSON.stringify(filteredUrls);
  } catch (e) {
    console.error(e);
    ctx.status = 400;
    ctx.body = e.message;
  }
}

module.exports = ["/gather_history", handler];
