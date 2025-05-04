const prompts = require("./evolution_prompt.js");
const chat = require("../../../utils/LLM/parseReply2Json.js");
const path = require("path");
const fs = require("fs");
const uniqueObjects = require("../../../utils/uniqueObjects.js");

const informParent = {
  ready(msg = "ready") {
    process.send({
      code: 0,
      msg,
    });
  },
  warning(msg) {
    process.send({
      code: 1,
      msg: `process ${process.pid}: ${msg}`,
    });
  },
  info(msg) {
    process.send({
      code: 2,
      msg: `process ${process.pid}: ${msg}`,
    });
  },
  error(code, msg) {
    process.send({
      code,
      msg: `process ${process.pid}: ${msg}`,
    });
  },
};

process.on("message", async (msg) => {
  const { source_url, model = process.env.LLM_MODEL, max_tokens } = msg;
  let { changes_info_relations } = msg;

  if (!model) {
    informParent.error(-1, "model not provided");
    informParent.ready();
    return;
  } else if (!source_url) {
    informParent.error("source url not provided");
    informParent.ready();
    return;
  } else if (path.extname(source_url) !== ".json") {
    informParent.error(-1, "invalid source url");
    informParent.ready();
    return;
  }
  informParent.info(`processing changes with model ${model}:\n- ${source_url}`);
  let add_triples = [];
  let delete_triples = [];
  //#region Load source info
  const json = JSON.parse(fs.readFileSync(source_url));
  if (
    typeof json !== "object" ||
    !Array.isArray(json.relations) ||
    !Array.isArray(json.add_triples) ||
    !Array.isArray(json.delete_triples)
  ) {
    informParent.error(-1, "invalid json");
    informParent.ready();
    return;
  }
  add_triples =
    json.add_triples.reduce(
      (acc, tripleRecord) => acc.concat(tripleRecord.triples),
      []
    ) || [];
  delete_triples =
    json.delete_triples.reduce(
      (acc, tripleRecord) => acc.concat(tripleRecord.triples),
      []
    ) || [];
  //#endregion

  try {
    let pass = false;
    let changes_info_triples = [];

    //#region 实验数据
    let escapeCount = 0;
    let costTime = 0;
    let totalUsage = {
      prompt_tokens: 0,
      completion_tokens: 0,
      cached_tokens: 0,
      reasoning_tokens: 0,
    };
    //#endregion
    while (!pass) {
      pass = true;
      if (escapeCount !== 0)
        informParent.info(
          `processing changes with model ${model}:\n- ${source_url}\n- escape count: ${escapeCount}`
        );

      //#region 构造输入
      const input = `existing_relations: ${JSON.stringify(
        changes_info_relations
      )}\nadd_triples: ${JSON.stringify(
        add_triples
      )}\ndelete_triples: ${JSON.stringify(delete_triples)}`;

      let startTime = Date.now();
      let { usage, result } = await chat(
        prompts.relation_evolution_prompt_zh(
          prompts.example_of_evolution_extraction,
          input
        ),
        max_tokens,
        model
      );
      if (typeof result === "string") {
        informParent.warning(`result is not a json object`);
        escapeCount += 1;
        pass = false;
      }

      //#region 记录实验数据
      costTime = Date.now() - startTime;
      totalUsage.prompt_tokens = usage.prompt_tokens;
      totalUsage.completion_tokens = usage.completion_tokens;
      totalUsage.cached_tokens = usage.prompt_tokens_details.cached_tokens;
      totalUsage.reasoning_tokens =
        usage.completion_tokens_details.reasoning_tokens;
      //#endregion

      //#region 去重
      changes_info_relations = uniqueObjects(
        changes_info_relations.concat(result.relations || [])
      );
      changes_info_triples = uniqueObjects(
        changes_info_triples.concat(result.changes_info_triples || [])
      );
      //#endregion
    }

    fs.writeFileSync(
      source_url,
      JSON.stringify(
        Object.assign({}, json, {
          changes_info_triples,
        })
      )
    );
    informParent.ready();
  } catch (e) {
    informParent.error(-1, e.message);
    informParent.ready();
  }
});

informParent.ready();
