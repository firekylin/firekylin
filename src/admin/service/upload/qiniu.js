const qiniu = require('qiniu');
const Base = require('./base');

/**
 * makeUploadToken
 * @desc 构建上传认证凭证
 *
 * @param {String} saveKey - 自定义资源名
 * @param {string} bucket - 要上传的空间
 * @param {string} accessKey - 七牛秘钥AccessKey
 * @param {string} secretKey - 七牛秘钥SecretKey
 *
 * @returns {string} - 上传认证凭证
 */
const makeUploadToken = (saveKey, bucket, accessKey, secretKey) => {
  const MAC = new qiniu.auth.digest.Mac(
    accessKey,
    secretKey,
  );
  const putPolicy = new qiniu.rs.PutPolicy({
    scope: `${bucket}`,
    saveKey: (saveKey && (`${saveKey}`).length) ? saveKey : null
  });
  return putPolicy.uploadToken(MAC);
};

const QINIU_CONF = new qiniu.conf.Config();
// 是否使用https域名
// QINIU_CONF.useHttpsDomain = true;
// 上传是否使用cdn加速
// QINIU_CONF.useCdnDomain = true;
// 机房 Zone 对象
// 华东 qiniu.zone.Zone_z0
// 华北 qiniu.zone.Zone_z1
// 华南 qiniu.zone.Zone_z2
// 北美 qiniu.zone.Zone_na0
// QINIU_CONF.zone = qiniu.zone.Zone_z0; // 华东机房

const formUploader = new qiniu.form_up.FormUploader(QINIU_CONF);

module.exports = class extends Base {
  // 导入方法
  async uploadMethod(filename, config) {
    // @see https://developer.qiniu.com/kodo/manual/1235/vars#magicvar
    const saveKey = (config.prefix && (`${config.prefix}`).length) ? `${config.prefix.replace(/\/$/, '')}/$(year)$(mon)$(day)/$(etag)$(ext)` : null;
    return new Promise((resolve, reject) => {
      formUploader.putFile(
        makeUploadToken(saveKey, config.bucket, config.accessKey, config.secretKey),
        null,
        filename,
        (new qiniu.form_up.PutExtra({
          // fname: '', // 请求体中的文件的名称
          // params: '', // 额外参数设置，参数名称必须以x:开头
          // mimeType: '', // 指定文件的mimeType
          // crc32: '', // 指定文件的crc32值
          // checkCrc: '', // 指定是否检测文件的crc32值
        })),
        (err, ret) => {
          if (!err) {
            // 上传成功， 处理返回值
            const origin = this.getAbsOrigin(config.origin);
            const compeletePath = `${origin}/${ret.key}`;
            resolve(compeletePath);
          } else {
            // 上传失败报错
            reject(err);
          }
        }
      );
    });
  }

  // 执行方法
  async run(file, config) {
    return await this.upload(file, config);
  }
}
