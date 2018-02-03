const path = require('path');
const moment = require('moment');

module.exports = class extends think.Service {
  init(...args) {
    super.init(...args);
  }

  // 域名不带http/https自动补全http
  getAbsOrigin(origin) {
    const reg = /^(https?:)?\/\/.+/;
    if (!reg.test(origin)) {
      return `http://${origin}`;
    }
    return origin;
  }

  // 获取当前的格式化时间
  formatNow() {
    return moment(new Date()).format('YYYYMMDD');
  }

  // 获取存储路径
  getSavePath(filename, prefix) {
    prefix = prefix ? `${prefix}/` : '';
    const dir = this.formatNow();
    const basename = path.basename(filename);
    return `${prefix}${dir}/${basename}`;
  }

  // 导入方法
  async uploadMethod() {}

  async upload(filename, config) {
    const result = await this.uploadMethod(filename, config);
    return result;
  }
}
