import qiniu from 'qiniu';
import Base from './base';

export default class extends Base {
  // 导入方法
  async uploadMethod(filename, config) {
    qiniu.conf.ACCESS_KEY = config.accessKey;
    qiniu.conf.SECRET_KEY = config.secretKey;
    const savePath = this.getSavePath(filename, config.prefix);
    const token = new qiniu.rs.PutPolicy(`${config.bucket}:${savePath}`).token();
    const extra = new qiniu.io.PutExtra();
    return new Promise((resolve, reject) => {
      qiniu.io.putFile(token, savePath, filename, extra, (err, ret) => {
        if (err) {
          reject(err);
        } else {
          const origin = this.getAbsOrigin(config.origin);
          const compeletePath = `${origin}/${ret.key}`;
          resolve(compeletePath);
        }
      });
    });
  }

  // 执行方法
  async run(file, config) {
    return await this.upload(file, config);
  }
}
