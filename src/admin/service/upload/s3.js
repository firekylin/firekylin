const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const Base = require('./base');

const readFileAsync = think.promisify(fs.readFile);
module.exports = class extends Base {
  parseConfig(config) {
    config.secretAccessKey = config.accessKeySecret;
    delete config.accessKeySecret;

    // 当 region 为 .(com|cn) 结尾时判断为 endpoint
    if(/\.\w+$/.test(config.region)) {
      config.s3BucketEndpoint = true;
      config.endpoint = config.region;
      config.region = 'default';
    }

    config.s3ForcePathStyle = true;
    return new AWS.Config(config);
  }

  // 导入方法
  async uploadMethod(filename, config) {
    const s3 = new AWS.S3(this.parseConfig(config));

    let savePath = this.getSavePath(filename, config.prefix);
    if (!path.extname(savePath)) {
      savePath += path.extname(config.file.name);
    }

    const fileData = await readFileAsync(filename);
    return new Promise((resolve, reject) => s3.upload({
      Bucket: config.bucket,
      Key: savePath,
      ACL: 'public-read',
      Body: fileData,
      ContentType: 'binary'
    }, {}, (err, data) => {
      if(err) {
        return reject(err);
      }
      resolve(data.Location);
    }));
  }

  // 执行方法
  async run(file, config) {
    return this.upload(file, config);
  }
}
