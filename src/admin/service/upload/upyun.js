const path = require("path");
const fs = require("fs");
const upyun = require("upyun");
const Base = require("./base");

module.exports = class extends Base {
  // 导入方法
  async uploadMethod(filename, config) {
    const upyunInstance = new upyun.Client(
      new upyun.Service(config.upyunBucket, config.operater, config.password)
    );
    let savePath = this.getSavePath(filename, config.upyunPrefix);
    if (!path.extname(savePath)) {
      savePath += path.extname(config.originalFileName);
    }
    return new Promise((resolve, reject) => {
      fs.readFile(filename, (err, data) => {
        if (err) {
          return reject(err);
        }
        upyunInstance
          .putFile(savePath, data)
          .then(res => {
            if (res === true || typeof res === "object") {
              const origin = this.getAbsOrigin(config.upyunOrigin);
              const compeletePath = `${origin}/${savePath}`;
              resolve(compeletePath);
            } else {
              reject(res);
            }
          })
          .catch(err => {
            reject(err);
          });
      });
    });
  }

  // 执行方法
  async run(file, config) {
    return await this.upload(file, config);
  }
};
