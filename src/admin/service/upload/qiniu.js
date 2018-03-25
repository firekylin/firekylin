const path = require('path');
const qiniu = require('qiniu');
const Base = require('./base');

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
const QINIU_CONF = new qiniu.conf.Config();
const formUploader = new qiniu.form_up.FormUploader(QINIU_CONF);

module.exports = class extends Base {
  /**
   * makeUploadToken
   * @desc 构建上传认证凭证
   *
   * @param {String} saveKey - 自定义资源名
   * @param {String} bucket - 要上传的空间
   * @param {String} accessKey - 七牛秘钥AccessKey
   * @param {String} secretKey - 七牛秘钥SecretKey
   *
   * @returns {String} - 上传认证凭证
   */
  makeUploadToken({bucket, accessKey, secretKey, prefix}) {
    let saveKey = '$(etag)$(ext)';
    if(!think.isEmpty(prefix)) {
      // @see https://developer.qiniu.com/kodo/manual/1235/vars#magicvar
      saveKey = path.join(prefix, '$(year)$(mon)$(day)', '$(etag)$(ext)');
    }

    const MAC = new qiniu.auth.digest.Mac(accessKey, secretKey);
    const putPolicy = new qiniu.rs.PutPolicy({scope: bucket, saveKey});
    return putPolicy.uploadToken(MAC);
  }

  /**
   * 上传到七牛
   * @param {String} token 上传认证凭证
   * @param {String} filename 上传文件
   *
   * @returns {Promise}
   */
  uploadToQiniu(token, filename) {
    const extra = new qiniu.form_up.PutExtra({
      // fname: '', // 请求体中的文件的名称
      // params: '', // 额外参数设置，参数名称必须以x:开头
      // mimeType: '', // 指定文件的mimeType
      // crc32: '', // 指定文件的crc32值
      // checkCrc: '', // 指定是否检测文件的crc32值
    });

    return new Promise((resolve, reject) => formUploader.putFile(
      token, null, filename, extra, (err, ret) => err ? reject(err) : resolve(ret)
    ));
  }

  // 导入方法
  async uploadMethod(filename, config) {
    const token = this.makeUploadToken(config);
    const result = await this.uploadToQiniu(token, filename);

    const origin = this.getAbsOrigin(config.origin);
    const compeletePath = `${origin}/${result.key}`;
    return compeletePath;
  }

  // 执行方法
  async run(file, config) {
    return await this.upload(file, config);
  }
}
