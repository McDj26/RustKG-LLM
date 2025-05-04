module.exports = {
  relation_diff_prompt_zh_zero_shot_no_rules: function (input) {
    return `# 知识图谱提取
你是一个知识图谱提取模型，请从给定文本中提取关系。

## 输入内容说明
existing_relations表示旧文本中已知的关系集合，context_triples表示旧文本中已知的三元组集合。add_triples表示新文本中出现或新增的三元组集合，delete_triples表示新文本中待删除的已知的三元组集合。
diff result是通过diff算法处理后的旧文本和新文本的差异。旧的文本通过标签<oldText></oldText>包裹，新的文本则通过标签<newText></newText>包裹。其余部分内容均未发生变化，仅作为上下文使用，过长的上下文会被截断，并用<!--unmodified-->标签表示。

请从给定文本中提取关系三元组，三元组格式为[主体，关系，对象]，并以JSON格式返回结果，所有出现的关系放在relations中，新增的关系三元组应放入add_triples中，待删除的关系三元组应放入delete_triples中：

## 任务
### 输入
${input}

### 输出
\`\`\`json
{
  "relations": [],
  "add_triples": [],
  "delete_triples": []
}
\`\`\`
`;
  },
  relation_diff_prompt_zh_zero_shot_with_rules: function (input) {
    return `# 知识图谱提取
你是一个知识图谱提取模型，请从给定文本中提取关系。

## 输入内容说明
existing_relations表示旧文本中已知的关系集合，context_triples表示旧文本中已知的三元组集合。add_triples表示新文本中出现或新增的三元组集合，delete_triples表示新文本中待删除的已知的三元组集合。
diff result是通过diff算法处理后的旧文本和新文本的差异。旧的文本通过标签<oldText></oldText>包裹，新的文本则通过标签<newText></newText>包裹。其余部分内容均未发生变化，仅作为上下文使用，过长的上下文会被截断，并用<!--unmodified-->标签表示。
在提取时应遵循下面的提取规则。

## 提取规则
1. 三元组格式为[主体, 关系, 客体]
2. 确保三元组唯一性
3. 三元组应在逻辑上原子化，例如["std","contains","alloc, any, arch, ascii"]是错误示例，需拆分为四个独立三元组
4. 三元组所使用的语言应与原文保持一致
5. 当别名冲突时，选择保留信息量最大的实体，如模块"std::alloc"和函数"std::alloc::alloc"都使用"alloc"作为别名时，应保留模块"std::alloc"的别名"alloc"，而函数"std::alloc::alloc"应使用全称
6. 注意提取文本各处隐含关系（如标签<td><a class="fn" href="fn.alloc.html" title="fn std::alloc::alloc">alloc</a><a title="unsafe function" href="#"><sup>⚠</sup></a></td>应提取["std::alloc::alloc","has feature","unsafe"]）
7. 三元组应能组成完整句子（如["std","contains","alloc"]正确，而["std", "is a module", "module"]错误）
8. 从newText中提取待添加三元组并放入add_triples中，若三元组已在context_triples中，应优先使用context_triples中存在的表达相同意思的三元组。若三元组已在delete_triples中，应将三元组从delete_triples中删除。若已在add_triples中，则不应重复添加
9. 从oldText中提取待删除三元组并放入delete_triples中，若三元组已在context_triples中，应优先使用context_triples中存在的表达相同意思的三元组。若三元组已在add_triples中，则不应加入delete_triples中。若已在delete_triples中，则不应重复删除
10. 从newText和oldText中能够提取相同的三元组时，应忽略该三元组
11. 禁止从现有三元组推导新三元组（如已有A是B、B是C时，不可推导A是C）
12. 提取三元组时应优先使用existing_relations中的关系，若无对应关系则添加新关系
13. 提取的三元组应使用主动语态，如"contains"而非"contained by"
14. 遵循上述规则的同时提取尽可能多的三元组

请完成任务，并以JSON格式返回结果，所有出现的关系放在relations中，新增的关系三元组应放入add_triples中，待删除的关系三元组应放入delete_triples中：

## 任务
### 输入
${input}

### 输出
\`\`\`json
{
  "relations": [],
  "add_triples": [],
  "delete_triples": []
}
\`\`\`
`;
  },
  relation_diff_prompt_zh_one_shot_with_rules: function (input, example) {
    return `# 知识图谱提取
你是一个知识图谱提取模型，请从给定文本中提取关系。

## 输入内容说明
existing_relations表示旧文本中已知的关系集合，context_triples表示旧文本中已知的三元组集合。add_triples表示新文本中出现或新增的三元组集合，delete_triples表示新文本中待删除的已知的三元组集合。
diff result是通过diff算法处理后的旧文本和新文本的差异。旧的文本通过标签<oldText></oldText>包裹，新的文本则通过标签<newText></newText>包裹。其余部分内容均未发生变化，仅作为上下文使用，过长的上下文会被截断，并用<!--unmodified-->标签表示。

## 提取规则
1. 三元组格式为[主体, 关系, 客体]
2. 确保三元组唯一性
3. 三元组应在逻辑上原子化，例如["std","contains","alloc, any, arch, ascii"]是错误示例，需拆分为四个独立三元组
4. 三元组所使用的语言应与原文保持一致
5. 当别名冲突时，选择保留信息量最大的实体，如模块"std::alloc"和函数"std::alloc::alloc"都使用"alloc"作为别名时，应保留模块"std::alloc"的别名"alloc"，而函数"std::alloc::alloc"应使用全称
6. 注意提取文本各处隐含关系（如标签<td><a class="fn" href="fn.alloc.html" title="fn std::alloc::alloc">alloc</a><a title="unsafe function" href="#"><sup>⚠</sup></a></td>应提取["std::alloc::alloc","has feature","unsafe"]）
7. 三元组应能组成完整句子（如["std","contains","alloc"]正确，而["std", "is a module", "module"]错误）
8. 从newText中提取待添加三元组并放入add_triples中，若三元组已在context_triples中，应优先使用context_triples中存在的表达相同意思的三元组。若三元组已在delete_triples中，应将三元组从delete_triples中删除。若已在add_triples中，则不应重复添加
9. 从oldText中提取待删除三元组并放入delete_triples中，若三元组已在context_triples中，应优先使用context_triples中存在的表达相同意思的三元组。若三元组已在add_triples中，则不应加入delete_triples中。若已在delete_triples中，则不应重复删除
10. 从newText和oldText中能够提取相同的三元组时，应忽略该三元组
11. 禁止从现有三元组推导新三元组（如已有A是B、B是C时，不可推导A是C）
12. 提取三元组时应优先使用existing_relations中的关系，若无对应关系则添加新关系
13. 提取的三元组应使用主动语态，如"contains"而非"contained by"
14. 遵循上述规则的同时提取尽可能多的三元组

请完成任务，并以JSON格式返回结果，所有出现的关系放在relations中，新增的关系三元组应放入add_triples中，待删除的关系三元组应放入delete_triples中，下面是一个示例：

## 示例
${example}

## 任务
### 输入
${input}

### 输出
`;
  },
  example_of_diff_extraction_one_shot_with_rules: `### 输入

existing_relations: ["contains", "is a", "has description", "has version"]
context_triples: [["std", "contains", "process"], ["process", "is a", "module"], ["process", "has description", "A module for working with processes."], ["std", "contains", "ptr"], ["ptr", "is a", "module"], ["ptr", "has description", "Raw, unsafe pointers, *const T, and *mut T"]]
delete_triples: [["rust", "has version", "1.30.1"], ["process", "is a", "module"]]
add_triples: [["rust", "has version", "1.31.1"]]
diff result:
ss=" module-item"> <td><a class="mod" href="prelude/index.html" title="mod std::prelude">prelude</a></td> <td class="docblock-short"> <p>The Rust Prelude.</p> </td> </tr> <tr class=" module-item"> <td><a class="mod" href="process/index.html" title="mod std::process">process</a></td> <td class="docblock-short"> <p>A module for working with processes.</p> </td> </tr> <tr class=" module-item"> <td><a class="mod" href="ptr/index.html" title="mod std::ptr">ptr</a></td> <td class="docblock-short"> <p>
<oldText>
Raw, unsafe pointers, <code>*const T</code>, and <code>*mut T</code>
</oldText>
ss=" module-item"> <td><a class="mod" href="prelude/index.ht
<!--unmodified-->
="mod std::ptr">ptr</a></td> <td class="docblock-short"> <p>
<newText>
Manually manage memory through raw pointers
</newText>

### 输出
\`\`\`json
{
  "relations": ["contains", "is a", "has description", "has version"],
  "add_triples": [["std", "contains", "process"], ["process", "is a", "module"], ["process", "has description", "A module for working with processes."], ["std", "contains", "ptr"], ["ptr", "is a", "module"], ["ptr", "has description", "Manually manage memory through raw pointers"]],
  "delete_triples": [["ptr", "has description", "Raw, unsafe pointers, *const T, and *mut T"]]
}
\`\`\`
`,
};
