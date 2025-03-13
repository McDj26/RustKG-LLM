/**
 * @type {TaskManager} 异步任务执行控制器
 */
module.exports = class TaskManager {
  constructor(maxConcurrency = 10) {
    this.tasks = [];
    this.runningCount = 0;
    this.maxConcurrency = maxConcurrency;
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
    }
  }

  async addTask(task) {
    this.tasks.push(task);
    await this.next();
  }

  /**
   * @param {any[]} array
   * @param {(val:any, index:number)=>any} func
   */
  async mapTasks(array, func) {
    await Promise.allSettled(
      array.map((val, index) => this.addTask(func.bind(array, val, index)))
    );
  }
};
