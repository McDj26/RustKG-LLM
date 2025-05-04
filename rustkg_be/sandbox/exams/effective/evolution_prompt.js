module.exports = {
  relation_evolution_prompt_zh: function (example, input) {
    return `# 知识图谱提取

你是一个知识图谱提取模型，请从给定三元组中提取实体在新旧版本之间的变化关系。
existing_relations表示已知的变化关系集合，add_triples表示新增三元组集合，delete_triples表示从删除三元组集合。

## 提取规则
1. 三元组格式应为[主体, 关系, 客体]
2. 确保三元组唯一性
3. 三元组应在逻辑上原子化。例如["exact_chunks, exact_chunks_mut", "renamed to", "chunks_exact, chunks_exact_mut"]是错误示例，需拆分为["exact_chunks", "renamed to", "chunks_exact"], ["exact_chunks_mut", "renamed to", "chunks_exact_mut"]
4. 三元组所使用的语言应与原文保持一致
5. 注意提取隐含关系（如add_triples中包含["alloc", "implements", "Default"]，则输出的changes_info_triples中应包含["alloc", "adds feature", "Default"]）
6. 三元组应能组成完整句子（如["exact_chunks", "renamed to chunks_exact", "chunks_exact"]错误）
7. 提取三元组时应优先使用existing_relations中的关系，若无对应关系则添加新关系
8. 提取的三元组中的主体应为旧文本中的实体，客体应为新文本中的实体，从而表示实体在旧文本和新文本之间的变化
9. 遵循上述规则的同时提取尽可能多的三元组

请完成任务，并以JSON格式返回结果，得到的三元组放在changes_info_triples中，在三元组中出现的所有关系放在relations中，下面是一个示例：

## 示例
${example}

## 任务
### 输入
${input}

### 输出
`;
  },
  example_of_evolution_extraction: `### 输入
existing_relations: ["adds feature"]
add_triples: [
  ["slice", "has method", "chunks_exact_mut"],
  [
    "chunks_exact_mut",
    "has description",
    "Returns an iterator over chunk_size elements of the slice at a time, starting at the beginning of the slice."
  ],
  [
    "chunks_exact_mut",
    "has example",
    "let v = &mut [0, 0, 0, 0, 0]; let mut count = 1; for chunk in v.chunks_exact_mut(2) { for elem in chunk.iter_mut() { *elem += count; } count += 1; } assert_eq!(v, &[1, 1, 2, 2, 0]);"
  ],
  ["chunks_exact_mut", "stable since", "1.31.0"],
]
delete_triples: [
  ["slice", "has method", "exact_chunks_mut"],
  ["exact_chunks_mut", "has parameter", "chunk_size"],
  ["exact_chunks_mut", "has return type", "ExactChunksMut<T>"],
  [
    "exact_chunks_mut",
    "has stability",
    "This is a nightly-only experimental API. (exact_chunks #47115)"
  ]
]

### 输出
{
  relations: ["adds feature", "renamed to"],
  changes_info_triples: [["exact_chunks_mut", "renamed to", "chunks_exact_mut"]],
}
`,
};
