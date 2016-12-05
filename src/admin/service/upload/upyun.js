import upyun from 'upyun';
import Base from './base';

export default class extends Base {
  // 导入方法
  async uploadMethod(filename, config) {
    const upyunInstance = new upyun(
      config.upyunBucket, config.operater, config.password, 'v0.api.upyun.com', { apiVersion: 'v2' }
    );
    const savePath = this.getSavePath(filename, config.upyunPrefix);
    return new Promise((resolve, reject) => {
      upyunInstance.putFile(savePath, filename, null, false, {
        'save-key': '/{year}{mon}{day}/{filename}{.suffix}'
      }, (err, res) => {
        if (err) {
          reject(err);
        } else {
          if (res.statusCode === 200) {
            const origin = this.getAbsOrigin(config.upyunOrigin);
            const compeletePath = `${origin}/${savePath}`;
            resolve(compeletePath);
          } else {
            reject(res);
          }
        }
      });
    });
  }

  // 执行方法
  async run(file, config) {
    return await this.upload(file, config);
  }
}
