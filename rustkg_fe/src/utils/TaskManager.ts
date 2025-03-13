/**
 * @type {TaskManager} 异步任务执行控制器
 */
export default class TaskManager {
  tasks: any[];
  runningCount: number;
  maxConcurrency: number;

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

  async addTask(task: any) {
    this.tasks.push(task);
    await this.next();
  }

  async mapTasks(array: any[], func: Function) {
    await Promise.allSettled(
      array.map((item, index) => this.addTask(func.bind(array, item, index)))
    );
  }
}
