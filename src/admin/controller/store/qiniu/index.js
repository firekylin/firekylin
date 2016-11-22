/**
 * @qiniu storage
 * @type {Object}
 */

import path from 'path';
import moment from 'moment';
import qiniu from 'qiniu';
import config from './config';

qiniu.conf.ACCESS_KEY = config.accessKey
qiniu.conf.SECRET_KEY = config.secretKey

export default {
  enable: config.enable,
  getSavePath(filename) {
    const now = new Date();
    const prefix = config.prefix;
    const dir = moment(now).format(config.format);
    const basename = path.basename(filename);
    return `${prefix}/${dir}/${basename}`;
  },
  getToken(filename) {
    const bucket = config.bucket;
    const savePath = this.getSavePath(filename)
    const putPolicy = new qiniu.rs.PutPolicy(`${bucket}:${savePath}`)
    return putPolicy.token();
  },
  upload(filename) {
    const self = this
    return new Promise((resolve, reject) => {
      const savePath = this.getSavePath(filename);
      const token = this.getToken(filename);
      const extra = new qiniu.io.PutExtra();
      qiniu.io.putFile(token, savePath, filename, extra, (err, ret) => {
        if (err) {
          reject(err);
        } else {
          const compeletePath = `${config.origin}/${ret.key}`
          resolve(compeletePath);
        }
      });
    });
  }
}
