module.exports = {
  relation_diff_prompt_zh: function (example, input) {
    return `# 知识图谱提取
你是一个知识图谱提取模型，请从给定文本中提取关系。

## 输入内容说明
existing_relations表示旧文本中已知的关系集合，existing_triples表示旧文本中已知的三元组集合。to_add_triples表示新文本中出现或新增的三元组集合，to_delete_triples表示新文本中待删除的已知的三元组集合。existing_links表示旧文本中已知的链接集合，to_add_links表示新文本中出现或新增的链接集合，to_delete_links表示新文本中待删除的旧链接集合。
旧的文本通过标签<oldText></oldText>包裹，新的文本则通过标签<newText></newText>包裹。<oldText></oldText>的内容将在新文本中被替换为<newText></newText>的内容。
旧的文本的上文通过<oldContext></oldContext>包裹，新的上文则通过<newContext></newContext>包裹。由于上下文长度限制，提供的上文可能存在截取和不完整的情况。
在提取时应关注oldText和newText之间的变化，而context中的内容仅作为上下文补充使用。

## 提取规则
1. 三元组格式应为[主体, 关系, 客体]
2. 确保三元组唯一性
3. 三元组应在逻辑上原子化。例如["std","contains","alloc, any, arch, ascii"]是错误示例，需拆分为四个独立三元组
4. 三元组所使用的语言应与原文保持一致
5. 当别名冲突时，选择保留信息量最大的实体，如模块"std::alloc"和函数"std::alloc::alloc"都使用"alloc"作为别名时，应保留模块"std::alloc"的别名"alloc"，而函数"std::alloc::alloc"应使用全称
6. 注意提取文本各处隐含关系（如标签<td><a class="fn" href="fn.alloc.html" title="fn std::alloc::alloc">alloc</a><a title="unsafe function" href="#"><sup>⚠</sup></a></td>应提取["std::alloc::alloc","has feature","unsafe"]）
7. 三元组应能组成完整句子（如["std","contains","alloc"]正确，而["std", "is a module", "module"]错误）
8. 从newText中提取的待添加三元组放入to_add_triples中，若已在existing_relations中，应优先将existing_relations中的三元组加入to_add_triples中，若已在to_delete_triples中，应同时将to_delete_triples中对应的三元组删除
9. 从oldText中提取的待删除三元组应在existing_relations中出现，放入to_delete_triples中，若已在to_add_triples中，应跳过该三元组
10. 若existing_relations中的一个三元组同时出现在oldText和newText中，则将三元组放入to_add_triples中，不可放入to_delete_triples
11. 禁止从现有三元组推导新三元组（如已有A是B、B是C时，不可推导A是C）
12. 从newText中提取的待添加链接放入to_add_links中，若已在existing_links中，应优先将existing_links中的链接加入to_add_links中，若已在to_delete_links中，应同时将to_delete_links中对应的链接记录删除
13. 从oldText中提取的待删除链接应在existing_links中出现，放入to_delete_links中，若已在to_add_links中，应跳过该链接
14. 若existing_links中的一个链接同时出现在oldText和newText中，则将链接放入to_add_links中，不可放入to_delete_links
15. 确保链接唯一性，若链接包含#号，则应忽略#号后的内容，如"index.html#abc-def"和"index.html#xyz"应视为同一链接
16. 若链接为相对路径，则应保留原始链接，不可转换为绝对路径
17. 遵循上述规则的同时提取尽可能多的三元组和链接

请完成任务，并以JSON格式返回结果，你不需要使用markdown的\`\`\`代码块将结果包裹，而是直接返回，下面是一个示例：

## 示例
${example}

## 任务
### 输入
${input}

### 输出
`;
  },
  example_of_diff_extraction: `### 输入

existing_relations: ["contains", "is a", "has description", "has version"]
existing_triples: [["std", "contains", "process"], ["process", "is a", "module"], ["process", "has description", "A module for working with processes."], ["std", "contains", "ptr"], ["ptr", "is a", "module"], ["ptr", "has description", "Raw, unsafe pointers, *const T, and *mut T"]]
to_delete_triples: [["rust", "has version", "1.30.1"], ["process", "is a", "module"]]
to_add_triples: [["rust", "has version", "1.31.1"]]
existing_links: ["process/index.html", "ptr/index.html"]
to_delete_links: ["process/index.html"]
to_add_links: []

<oldContext>
ss=" module-item"> <td><a class="mod" href="prelude/index.html" title="mod std::prelude">prelude</a></td> <td class="docblock-short"> <p>The Rust Prelude.</p> </td> </tr> <tr class=" module-item"> <td><a class="mod" href="process/index.html" title="mod std::process">process</a></td> <td class="docblock-short"> <p>A module for working with processes.</p> </td> </tr> <tr class=" module-item"> <td><a class="mod" href="ptr/index.html" title="mod std::ptr">ptr</a></td> <td class="docblock-short"> <p>        
</oldContext>
<oldText>
Raw, unsafe pointers, <code>*const T</code>, and <code>*mut T</code>
</oldText>
<newContext>
ss=" module-item"> <td><a class="mod" href="prelude/index.html" title="mod std::prelude">prelude</a></td> <td class="docblock-short"> <p>The Rust Prelude.</p> </td> </tr> <tr class=" module-item"> <td><a class="mod" href="process/index.html" title="mod std::process">process</a></td> <td class="docblock-short"> <p>A module for working with processes.</p> </td> </tr> <tr class=" module-item"> <td><a class="mod" href="ptr/index.html" title="mod std::ptr">ptr</a></td> <td class="docblock-short"> <p>        
</newContext>
<newText>
Manually manage memory through raw pointers
</newText>

### 输出
{
  "relations": ["contains", "is a", "has description", "has version"],
  "to_delete_triples": [["rust", "has version", "1.30.1"], ["ptr", "has description", "Raw, unsafe pointers, *const T, and *mut T"]],
  "to_add_triples": [["rust", "has version", "1.31.1"], ["std", "contains", "process"], ["process", "is a", "module"], ["process", "has description", "A module for working with processes."], ["std", "contains", "ptr"], ["ptr", "is a", "module"], ["ptr", "has description", "Manually manage memory through raw pointers"]],
  "to_delete_links": [],
  "to_add_links": ["prelude/index.html", "process/index.html", "ptr/index.html"]
}
`,
};
