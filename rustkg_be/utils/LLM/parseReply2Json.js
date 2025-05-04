const OpenAI = require("openai");
const { jsonrepair } = require("jsonrepair");
require("dotenv").config();
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_API_BASE_URL = process.env.LLM_API_BASE_URL;

const openai = new OpenAI({
  apiKey: LLM_API_KEY,
  baseURL: LLM_API_BASE_URL,
});

/**
 * @param {string} prompt
 * @param {string} model
 * @returns {Promise<{
 * usage: {
 *  prompt_tokens: number;
 *  completion_tokens: number;
 *  prompt_tokens_details: {cached_tokens: number};
 *  completion_tokens_details: {reasoning_tokens: number};
 * };
 * result: object | string;
 * }>}
 */
module.exports = async function (
  prompt,
  max_tokens = 4 * 1024,
  model = process.env.LLM_MODEL
) {
  if (!model) {
    throw new Error("please provide a model");
  }
  const completion = await openai.chat.completions.create({
    model: model,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens,
  });

  const usage = completion.usage;
  let result = completion.choices[0].message.content.trim();
  // 如果返回的json被包裹在代码块中，使用正则表达式的命名分组匹配中间的内容
  if (result.startsWith("`") || result.endsWith("`")) {
    result = /(```json)?(?<result>.*)/is.exec(result).groups.result;
    while (result.endsWith("`")) result = result.slice(0, -1);
  }

  try {
    return { usage, result: JSON.parse(jsonrepair(result)) };
  } catch (error) {
    return { usage, result };
  }
};
