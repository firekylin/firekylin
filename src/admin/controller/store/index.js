/**
 * @qiniu storage
 * @type {Object}
 */

import path from 'path';
import moment from 'moment';
import qiniu from 'qiniu';

const SETTINGS_PATH = path.join(think.RESOURCE_PATH, 'settings.json');
const settings = think.safeRequire(SETTINGS_PATH) || {};
const config = settings.store || {}

qiniu.conf.ACCESS_KEY = config.accessKey
qiniu.conf.SECRET_KEY = config.secretKey

function getSavePath(filename) {
  const now = new Date();
  const prefix = config.prefix;
  const dir = moment(now).format(config.format);
  const basename = path.basename(filename);
  return `${prefix}/${dir}/${basename}`;
}

function getToken(filename) {
  const bucket = config.bucket;
  const savePath = getSavePath(filename)
  const putPolicy = new qiniu.rs.PutPolicy(`${bucket}:${savePath}`)
  return putPolicy.token();
}

export default {
  enable: config.enable,
  type: config.type,
  upload(filename) {
    return new Promise((resolve, reject) => {
      const savePath = getSavePath(filename);
      const token = getToken(filename);
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
