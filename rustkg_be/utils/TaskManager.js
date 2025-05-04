/**
 * @type {TaskManager} 异步任务执行控制器
 */
module.exports = class TaskManager {
  constructor(maxConcurrency = 10) {
    this.tasks = [];
    this.runningCount = 0;
    this.maxConcurrency = maxConcurrency;
    this.taskCompleteCallback = [];
  }

  /**
   * @param {"taskComplete"} event
   * @param {Function} callback
   */
  addEventListener(event, callback) {
    if (event === "taskComplete" && typeof callback === "function") {
      this.taskCompleteCallback.push(callback);
    }
  }

  async next() {
    if (this.tasks.length === 0 || this.runningCount >= this.maxConcurrency)
      return;

    this.runningCount++;
    const func = this.tasks.shift();
    await func();
    this.runningCount--;

    if (this.tasks.length > 0) {
      await this.next();
    } else {
      this.taskCompleteCallback.forEach((callback) => callback());
    }
  }

  async addTask(task) {
    this.tasks.push(task);
    await this.next();
  }

  /**
   * @param {any[] | number} array
   * @param {(val:any, index:number)=>any} func
   */
  async mapTasks(array, func) {
    if (typeof array === "number") {
      array = new Array(array).fill(null);
    }
    await Promise.allSettled(
      array.map((val, index) => this.addTask(func.bind(array, val, index)))
    );
  }
};
