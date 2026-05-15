const OSS = require('ali-oss');
const Base = require('./base');

module.exports = class extends Base {
  // 导入方法
  async uploadMethod(filename, config) {
    const client = new OSS({
      region: config.region,
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      bucket: config.bucket
    });
    const savePath = this.getSavePath(filename, config.prefix);
    const origin = this.getAbsOrigin(config.origin);
    const result = await client.put(savePath, filename);
    return `${origin}/${result.name}`;
  }

  // 执行方法
  async run(file, config) {
    return await this.upload(file, config);
  }
};
