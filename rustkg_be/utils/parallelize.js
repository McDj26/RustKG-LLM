const { fork } = require("child_process");

module.exports = (filePath, maxConcurrency = 16) => {
  const tasks = [];
  const workers = {};
  const newWorker = (filePath) => {
    const child = fork(filePath);
    workers[child.pid] = {
      process: child,
      idleSince: Date.now(),
      busy: true,
      taskInfo: null,
    };
    child.addListener("message", ({ code, msg }) => {
      if (code !== 0) {
        switch (code) {
          case 1:
            console.warn(msg);
            break;
          case 2:
            console.info(msg);
            break;
          default:
            if (workers[child.pid].taskInfo) {
              workers[child.pid].taskInfo.callback({ reason: msg });
            }
            console.error(msg);
        }
        return;
      }
      workers[child.pid].taskInfo?.callback(msg);
      if (tasks.length > 0) {
        const { args, callback } = tasks.shift();
        workers[child.pid].busy = true;
        workers[child.pid].taskInfo = { args, callback };
        child.send(args);
      } else {
        workers[child.pid].busy = false;
        workers[child.pid].idleSince = Date.now();
        workers[child.pid].taskInfo = null;
      }
    });
    child.addListener("exit", () => {
      delete workers[child.pid];
    });
  };
  const killWorker = (pid) => {
    workers[pid].process.removeAllListeners();
    workers[pid].process.kill();
    delete workers[pid];
  };
  const checkIdle = () => {
    let removeList = [];
    Object.entries(workers).forEach(([key, value]) => {
      if (!value.busy && Date.now() - value.idleSince > 60000) {
        removeList.push(key);
      }
    });
    removeList.forEach(killWorker);
    setTimeout(checkIdle, 1000);
  };
  newWorker(filePath);
  checkIdle();
  return {
    /**
     * @param {any} args
     */
    exec: (args) => {
      return new Promise((resolve) => {
        const workerInfo = Object.entries(workers).find(
          ([, value]) => !value.busy
        );
        if (workerInfo) {
          workers[workerInfo[0]].busy = true;
          workers[workerInfo[0]].taskInfo = { args, callback: resolve };
          workers[workerInfo[0]].process.send(args);
        } else {
          tasks.push({
            args,
            callback: resolve,
          });
          if (Object.keys(workers).length < maxConcurrency) newWorker(filePath);
        }
      });
    },
    stop: () => {
      Object.keys(workers).forEach(killWorker);
    },
  };
};
