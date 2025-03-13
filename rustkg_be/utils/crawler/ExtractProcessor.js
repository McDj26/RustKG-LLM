const OperatorExecutor = require("./OperatorExecutor");

module.exports = class ExtractProcessor {
  /**
   * @param {{
   * [key: string]: {
   *   selector: string,
   *   attribute: string,
   *   process?: {
   *     type: string,
   *     args?: any[],
   *   }[],
   *   after?: {
   *     type: string,
   *     args?: any[],
   *   }[],
   * }
   * }} extractRule
   */
  constructor(extractRule) {
    this.entries = Object.keys(extractRule);
    this.extractRule = extractRule;

    // 静态生成提取器
    this.extractOps = this.entries.reduce((val, key) => {
      const processList = OperatorExecutor.translateToProcessList(
        key,
        this.extractRule[key].process || []
      );
      val[key] = (result, data) => {
        result[key] = OperatorExecutor.executeProcessList(processList, data);
      };
      return val;
    }, {});
  }

  /**
   * @param {import('puppeteer').Page} page
   */
  async process(page) {
    const result = {};
    await Promise.all(
      this.entries.map(async (key) => {
        if (!("selector" in this.extractRule[key])) return;
        let data;
        try {
          data = await page.$$eval(
            this.extractRule[key].selector,
            (els, attrName) => {
              const res = els.map((el) => el[attrName]).filter(Boolean);
              return res.length > 1 ? res : res.length === 1 ? res[0] : null;
            },
            this.extractRule[key].attribute
          );
        } catch (error) {
          data = undefined;
        } finally {
          this.extractOps[key]?.(result, data);
        }
      })
    );

    // 动态生成后处理器
    const afterOps = this.entries
      .map((key) => {
        const afterProcessList = OperatorExecutor.translateToAfterProcessList(
          this.extractRule[key].after || [],
          result
        );
        if (afterProcessList.length === 0) return null;
        return (data) => {
          data[key] = OperatorExecutor.executeProcessList(
            afterProcessList,
            data[key]
          );
        };
      })
      .filter(Boolean);

    await Promise.all(
      afterOps.map(async (op) => {
        op(result);
      })
    );

    return result;
  }
};
