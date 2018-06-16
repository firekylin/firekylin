const fs = require('fs');
const path = require('path');
const upyun = require('upyun');
const Base = require('./base');

const readFileAsync = think.promisify(fs.readFile);
module.exports = class extends Base {
  // 导入方法
  async uploadMethod(filename, {upyunBucket, operater, password, upyunPrefix, upyunOrigin, file}) {
    const service = new upyun.Service(upyunBucket, operater, password);
    const upyunInstance = new upyun.Client(service);
    let savePath = this.getSavePath(filename, upyunPrefix);
    if (!path.extname(savePath)) {
      savePath += path.extname(file.name);
    }

    const fileData = await readFileAsync(filename);
    const resp = await upyunInstance.putFile(savePath, fileData);
    if(resp !== true && typeof resp !== 'object') {
      throw new Error(resp);
    }

    const origin = this.getAbsOrigin(upyunOrigin);
    const compeletePath = `${origin}/${savePath}`;
    return compeletePath;
  }

  // 执行方法
  async run(file, config) {
    return this.upload(file, config);
  }
};
