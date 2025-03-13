const ExtractOperatorFactory = require("./OperatorFactory/ExtractOperator");
const AfterOperatorFactory = require("./OperatorFactory/AfterOperator");
const { EndOfProcess } = require("./constants");

module.exports = class OperatorExecutor {
  /**
   * @param {((val: any) => any)[]} processList
   * @param {any} data
   */
  static executeProcessList(processList, data) {
    let result = data;

    for (const processor of processList) {
      const res = processor(result);
      if (res instanceof Object && "EndOfProcess" in res) {
        result = res.val;
        break;
      } else result = res;
    }
    return result;
  }

  /**
   * @param {string} ruleName
   * @param {{ type: string; args?: any[]; }[] } process
   * @returns {((data: any) => any)[]}
   */
  static translateToProcessList(ruleName, process) {
    return process
      .map((config) => {
        let wrappedProcessList;
        switch (config.type) {
          case "processByConfigs":
            if (!Array.isArray(config.args)) {
              console.warn(
                `Process processByConfig in ${ruleName} has empty args. This may cause unexpected behavior.`
              );
              break;
            } else if (config.args.length === 0) {
              console.warn(
                `Process processByConfigs in ${ruleName} expect 1 arguments but got 0.`
              );
              break;
            } else if (!(config.args[0] instanceof Object)) {
              console.warn(
                `Process processByConfigs in ${ruleName} expect 1st argument to be object but got ${typeof config
                  .args[0]}.`
              );
              break;
            }

            const configObj = config.args[0];
            const wrappedProcessListObj = Object.keys(configObj).reduce(
              (res, ruleName) => {
                res[ruleName] = OperatorExecutor.translateToProcessList(
                  `${ruleName} -> processByConfigs`,
                  configObj[ruleName]
                );
                return res;
              },
              {}
            );

            return (data) =>
              Object.keys(wrappedProcessListObj).reduce((res, ruleName) => {
                res[ruleName] = OperatorExecutor.executeProcessList(
                  wrappedProcessListObj[ruleName],
                  data
                );
                return res;
              }, {});
          case "map":
            if (!Array.isArray(config.args)) {
              console.warn(
                `Process map in ${ruleName} has empty args. This may cause unexpected behavior.`
              );
              break;
            }

            wrappedProcessList = OperatorExecutor.translateToProcessList(
              `${ruleName} -> map`,
              config.args
            );
            return (data) =>
              "elements" in data
                ? data.elements
                    .map((_, el) => data.$(el))
                    .toArray()
                    .map((element) =>
                      OperatorExecutor.executeProcessList(wrappedProcessList, {
                        elements: element,
                        $: data.$,
                      })
                    )
                : Array.isArray(data)
                ? data.map((item) =>
                    OperatorExecutor.executeProcessList(
                      wrappedProcessList,
                      item
                    )
                  )
                : data;
          case "setElementAttribute":
            if (!Array.isArray(config.args)) {
              console.warn(
                `Process setElementProp in ${ruleName} has empty args. This may cause unexpected behavior.`
              );
              break;
            } else if (config.args.length !== 2) {
              console.warn(
                `Process setElementProp in ${ruleName} expect 2 arguments but got ${config.args.length}.`
              );
              break;
            }
            if (typeof config.args[1] === "string") {
              return (data) => {
                data.elements.prop(config.args[0], config.args[1]);
                return data;
              };
            } else if (!Array.isArray(config.args[1])) {
              console.warn(
                `Process setElementProp in ${ruleName} expect 2nd argument to be string or array but got ${typeof config
                  .args[1]}.`
              );
              break;
            }

            wrappedProcessList = OperatorExecutor.translateToProcessList(
              `${ruleName} -> setElementProp`,
              config.args[1]
            );
            const fnName =
              config.args[0] === "innerHTML"
                ? "html"
                : config.args[0] === "innerText"
                ? "text"
                : "prop";
            return (data) => {
              const val = OperatorExecutor.executeProcessList(
                wrappedProcessList,
                data
              );
              if (fnName !== "prop") {
                data.elements[fnName](val);
              } else {
                data.elements[fnName](config.args[0], val);
              }
              return data;
            };
          case "seperateProcess":
            if (!Array.isArray(config.args)) {
              console.warn(
                `Process seperate in ${ruleName} has empty args. This may cause unexpected behavior.`
              );
              break;
            }
            wrappedProcessList = OperatorExecutor.translateToProcessList(
              `${ruleName} -> seperate`,
              config.args
            );
            return (data) => {
              OperatorExecutor.executeProcessList(wrappedProcessList, data);
              return data;
            };
          default:
            return ExtractOperatorFactory[config.type](config.args);
        }
        return () => EndOfProcess;
      })
      .filter(Boolean);
  }

  /**
   * @param {{ type: string; args?: any[]; }[]} process
   * @param {any} result
   * @returns {((data: any) => any)[]}
   */
  static translateToAfterProcessList(process, result) {
    return process
      .map((config) => {
        let args = config.args || [];
        args = args.map((arg) =>
          typeof arg === "string" && arg.startsWith("$")
            ? result[arg.slice(1)]
            : arg
        );
        return AfterOperatorFactory[config.type]?.(args);
      })
      .filter(Boolean);
  }
};
