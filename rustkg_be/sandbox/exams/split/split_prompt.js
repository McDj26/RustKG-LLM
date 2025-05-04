module.exports = {
  relation_extraction_prompt_zh: function (example, input) {
    return `# 知识图谱抽取
你是一个知识图谱提取模型。请从<sourceText>标签的内容中提取新增的知识图谱三元组，上文内容已在<context>标签中给出。
输入中的existing_relations和relation_triples是已知的关系和三元组，作为上下文的补充信息。
请始终遵循以下规则：
1. 关系必须存在于现有关系列表中，必要时可向列表中添加新关系。
2. 关系必须直接来自源文本，禁止从现有关系推导新关系（如已有A是B、B是C时，不可推导A是C）
3. 三元组格式应为[主体, 关系, 客体]
4. 确保三元组唯一性
5. 三元组应在逻辑上原子化。例如["std","contains","alloc, any, arch, ascii"]是错误示例，需拆分为四个独立三元组
6. 三元组所使用的语言应与原文保持一致
7. 三元组应能组成完整句子（如["std","contains","alloc"]正确，而["std", "is a module", "module"]错误）
8. 当别名冲突时，选择保留信息量最大的实体，如模块"std::alloc"和函数"std::alloc::alloc"都使用"alloc"作为别名时，应保留模块"std::alloc"的别名"alloc"，而函数"std::alloc::alloc"应使用全称
9. 注意提取文本各处隐含关系（如标签<td><a class="fn" href="fn.alloc.html" title="fn std::alloc::alloc">alloc</a><a title="unsafe function" href="#"><sup>⚠</sup></a></td>应提取["std::alloc::alloc","has attribute","unsafe"]）
10. 请提取尽可能多的三元组，同时遵循上述规则
11. 请提取在当前页面中出现的、可能与当前提取出的实体存在关系的其它页面的路径，且应保留原始的相对或绝对路径。注意避免提取相同的路径，如"index.html"和"index.html#section"应视为同一页面
请完成任务，并以JSON格式返回结果，你不需要使用markdown的\`\`\`代码块将结果包裹，而是直接返回，下面是一个示例：

## 示例
${example}
## 任务
### 输入
${input}
`;
  },
  example_of_relation_extraction: `### Input

existing_relations: ["is a", "has full name", "stable since"]
relation_triples: [
  ["CommandExt", "is a", "Trait"],
  ["CommandExt", "has full name", "std::os::windows::process::CommandExt"],
  ["CommandExt", "stable since", "1.16.0"],
]
<context>
<section id="main" class="content">
  <h1 class="fqn">
    <span class="out-of-band"
      ><span class="since" title="Stable since Rust version 1.16.0">1.16.0</span
      ><span id="render-detail"
        ><a
          id="toggle-all-docs"
          href="javascript:void(0)"
          title="collapse all docs"
          >[<span class="inner">−</span>]</a
        ></span
      ><a
        class="srclink"
        href="../../../../src/std/sys/windows/ext/process.rs.html#107-115"
        title="goto source code"
        >[src]</a
      ></span
    ><span class="in-band"
      >Trait <a href="../../../index.html">std</a>::<wbr /><a
        href="../../index.html"
        >os</a
      >::<wbr /><a href="../index.html">windows</a>::<wbr /><a href="index.html"
        >process</a
      >::<wbr /><a class="trait" href="">CommandExt</a></span
    >
  </h1>
</context>
<sourceText>
  <div class="toggle-wrapper collapsed">
    <a href="javascript:void(0)" class="collapse-toggle"
      >[<span class="inner">+</span>]<span
        class="toggle-label"
        style="font-size: 20px"
        >&nbsp;Show&nbsp;declaration</span
      ></a
    >
  </div>
  <div class="docblock type-decl hidden-by-usual-hider">
    <pre class="rust trait">pub trait CommandExt {
  fn <a href="#tymethod.creation_flags" class="fnname">creation_flags</a>(&amp;mut self, flags: <a class="primitive" href="../../../primitive.u32.html">u32</a>) -&gt; &amp;mut <a class="struct" href="../../../../std/process/struct.Command.html" title="struct std::process::Command">Command</a>;
}</pre>
  </div>
  <div class="stability">
    <div class="stab portability">
      This is supported on <strong>Windows</strong> only.
    </div>
  </div>
  <div class="toggle-wrapper">
    <a href="javascript:void(0)" class="collapse-toggle"
      >[<span class="inner">−</span>]<span
        class="toggle-label"
        style="display: none"
        >&nbsp;Expand&nbsp;description</span
      ></a
    >
  </div>
  <div class="docblock">
    <p>
      Windows-specific extensions to the
      <a href="../../../../std/process/struct.Command.html"
        ><code>process::Command</code></a
      >
      builder.
    </p>
  </div>
  <h2 id="required-methods" class="small-section-header">
    Required Methods<a href="#required-methods" class="anchor"></a>
  </h2>
  <div class="methods">
    <h3 id="tymethod.creation_flags" class="method">
      <span id="creation_flags.v" class="invisible"
        ><code
          >fn
          <a href="#tymethod.creation_flags" class="fnname">creation_flags</a
          >(&amp;mut self, flags:
          <a class="primitive" href="../../../primitive.u32.html">u32</a>) -&gt;
          &amp;mut
          <a
            class="struct"
            href="../../../../std/process/struct.Command.html"
            title="struct std::process::Command"
            >Command</a
          ></code
        ></span
      ><a href="javascript:void(0)" class="collapse-toggle"
        >[<span class="inner">−</span>]</a
      >
    </h3>
    <div class="stability">
      <div class="stab portability">
        This is supported on <strong>Windows</strong> only.
      </div>
    </div>
    <div class="docblock">
      <p>
        Sets the
        <a
          href="https://msdn.microsoft.com/en-us/library/windows/desktop/ms684863(v=vs.85).aspx"
          >process creation flags</a
        >
        to be passed to <code>CreateProcess</code>.
      </p>
      <p>
        These will always be ORed with <code>CREATE_UNICODE_ENVIRONMENT</code>.
      </p>
    </div>
  </div>
  <h2 id="implementors" class="small-section-header">
    Implementors<a href="#implementors" class="anchor"></a>
  </h2>
  <div class="item-list" id="implementors-list">
    <h3 id="impl-CommandExt" class="impl">
      <span class="in-band"
        ><table class="table-display">
          <tbody>
            <tr>
              <td>
                <code
                  >impl CommandExt for
                  <a
                    class="struct"
                    href="../../../../std/process/struct.Command.html"
                    title="struct std::process::Command"
                    >Command</a
                  ></code
                ><a href="#impl-CommandExt" class="anchor"></a>
              </td>
              <td>
                <span class="out-of-band"
                  ><div class="ghost"></div>
                  <a
                    class="srclink"
                    href="../../../../src/std/sys/windows/ext/process.rs.html#118-123"
                    title="goto source code"
                    >[src]</a
                  ></span
                >
              </td>
            </tr>
          </tbody>
        </table></span
      ><a href="javascript:void(0)" class="collapse-toggle"
        >[<span class="inner">−</span>]</a
      >
    </h3>
    <div class="impl-items">
      <h4 id="method.creation_flags" class="method">
        <span id="creation_flags.v-1" class="invisible"
          ><table class="table-display">
            <tbody>
              <tr>
                <td>
                  <code
                    >fn
                    <a href="#method.creation_flags" class="fnname"
                      >creation_flags</a
                    >(&amp;mut self, flags:
                    <a class="primitive" href="../../../primitive.u32.html"
                      >u32</a
                    >) -&gt; &amp;mut
                    <a
                      class="struct"
                      href="../../../../std/process/struct.Command.html"
                      title="struct std::process::Command"
                      >Command</a
                    ></code
                  >
                </td>
                <td>
                  <span class="out-of-band"
                    ><div class="ghost"></div>
                    <a
                      class="srclink"
                      href="../../../../src/std/sys/windows/ext/process.rs.html#119-122"
                      title="goto source code"
                      >[src]</a
                    ></span
                  >
                </td>
              </tr>
            </tbody>
          </table></span
        >
      </h4>
      <div class="stability">
        <div class="stab portability">
          This is supported on <strong>Windows</strong> only.
        </div>
      </div>
    </div>
  </div>
</section>
</sourceText>

### Output
{
  relations: ["is a", "has full name", "stable since", "has declaration", "has stability", "requires method", "has description", "has argument", "has type", "has return type", "implements"],
  add_triples: [
    ["CommandExt", "has declaration", "pub trait CommandExt { fn creation_flags(&mut self, flags: u32) -> &mut Command; }"],
    ["CommandExt", "has stability", "This is supported on Windows only."],
    ["CommandExt", "requires method", "creation_flags"],
    ["CommandExt", "has description", "Windows-specific extensions to the process::Command builder."],
    ["creation_flags", "is a", "function"],
    ["creation_flags", "has full name", "std::process::Command::creation_flags"],
    ["creation_flags", "has argument", "creation_flags::self"],
    ["creation_flags", "has argument", "creation_flags::flags"],
    ["creation_flags", "has return type", "&mut Command"],
    ["creation_flags", "has description", "Sets the process creation flags to be passed to CreateProcess. These will always be ORed with CREATE_UNICODE_ENVIRONMENT."],
    ["creation_flags", "has stability", "This is supported on Windows only."],
    ["creation_flags::flags", "has type", "u32"],
    ["Command", "is a", "struct"],
    ["Command", "has full name", "std::process::Command"],
    ["Command", "implements", "CommandExt"],
  ],
  add_links: [
    "../../../../std/index.html",
    "trait.ExitStatusExt.html",
    "",
    "../../../index.html",
    "../../index.html",
    "../index.html",
    "index.html",
    "../../../../std/process/struct.Command.html",
    "../../../primitive.u32.html",
    "https://msdn.microsoft.com/en-us/library/windows/desktop/ms684863(v=vs.85).aspx",
  ],
}`,
};
