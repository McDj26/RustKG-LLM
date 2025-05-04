# Rust 文档知识图谱构建工具

## 项目说明

本工具通过 LLM 分析多版本 Rust 文档，自动构建包含版本演进信息的知识图谱。核心入口为`sandbox/exams/effective/effective_exam.js`。

## 配置项说明

```javascript
// 配置文件位于 sandbox/exams/effective/ 目录下
const examURLs = require("./examURLs.json"); // 待分析的文档路径列表
const examVersions = require("./examVersions.json"); // Rust版本列表
const model = "deepseek-r1-250120"; // 使用的LLM模型
const contextLength = 400; // 上下文分析长度
const windowLength = 39000; // 最大文本窗口长度
const maxAnalyzeTimes = 3; // 最大分析次数/版本
const outputsPath = path.join(__dirname, "output/zero-shot-with-rules"); // 结果输出目录
function getExamURL(baseExamURL, examVersion) {
  // path to rust doc
  return `file:///C:/Users/Dj/.rustup/toolchains/${examVersion}-x86_64-pc-windows-msvc/share/doc/rust/html/${baseExamURL}`;
} // 根据文档版本生成路径的函数
```

## 输出目录结构

```bash
output/
└── zero-shot-with-rules/
    └── [文档名称]_[版本号]/  // 例如 std_index-1.70
        ├── merged_*.json    // 合并后的知识三元组
        └── *.json          // 原始分析结果
```

## 合并后的知识三元组格式

```json
{
  "create_time": "2025-04-05T12:02:16.008Z", // 分析任务创建时间
  "id": "merged_2a413541-1b8e-4f20-b01e-9004d1f6f7bb", // 合并结果唯一标识
  "source_url": "file:///rust/doc/html/std/index.html", // 源文档路径
  "merged_triples": [
    {
      "triples": [
        ["std", "version", "1.0.0"],
        ["std", "contains", "fs"],
        ["fs", "defines", "File"]
      ],
      "startIndex": 0, // 源文档起始位置
      "endIndex": 39000 // 源文档结束位置
    }
  ],
  "changes_info_triples": [
    // 版本演进信息
    ["std", "version updated to", "1.40.0"],
    ["future", "stabilized", ""]
  ],
  "model": "deepseek-r1-250120" // 使用的分析模型
}
```

字段说明：

1. merged_triples ：合并后的知识三元组，包括但不限于
   - 模块层级关系（如 ["std", "contains", "fs"] ）
   - 类型定义（如 ["fs", "defines", "File"] ）
   - 属性标记（如 ["intrinsics", "has attribute", "unstable"] ）
2. changes_info_triples ：记录跨版本变化，包括但不限于
   - 版本升级（如 ["std", "version updated to", "1.70.0"] ）
   - 模块增删（如 ["std", "adds module", "backtrace"] ）
   - 特性变更（如 ["future", "removes attribute", "Experimental"] ）

## 运行要求

- Node.js 18.17+
- 有效的 OpenAI API 密钥

## 运行方式

在 rustkg-be 目录下按照.env.example 创建.env 文件，填入 OpenAI API 密钥

```bash
LLM_API_KEY="YOUR OPENAI API KEY HERE"
LLM_API_BASE_URL="YOUR OPENAI API BASE URL HERE"
```

```bash
# 进入项目目录
cd rustkg-be
# 安装依赖
npm i -g pnpm # 安装 pnpm（如果尚未安装）
pnpm i
# 运行脚本
node sandbox/exams/effective/effective_exam.js
```
