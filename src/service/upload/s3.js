const fs = require('fs');
const path = require('path');
const {S3Client} = require('@aws-sdk/client-s3');
const {Upload} = require('@aws-sdk/lib-storage');
const Base = require('./base');

const readFileAsync = think.promisify(fs.readFile);
module.exports = class extends Base {
  parseConfig(config) {
    const clientConfig = {
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.accessKeySecret
      },
      forcePathStyle: true
    };

    // 当 region 为 .(com|cn) 结尾时判断为 endpoint
    if (/\.\w+$/.test(config.region)) {
      clientConfig.bucketEndpoint = true;
      clientConfig.endpoint = this.getAbsOrigin(config.region);
      clientConfig.region = 'default';
    }

    return clientConfig;
  }

  createClient(config) {
    return new S3Client(this.parseConfig(config));
  }

  createUpload(client, params) {
    return new Upload({client, params});
  }

  // 导入方法
  async uploadMethod(filename, config) {
    const s3 = this.createClient(config);

    let savePath = this.getSavePath(filename, config.prefix);
    if (!path.extname(savePath)) {
      savePath += path.extname(config.file.name);
    }

    const fileData = await readFileAsync(filename);
    const upload = this.createUpload(s3, {
      Bucket: config.bucket,
      Key: savePath,
      ACL: 'public-read',
      Body: fileData,
      ContentType: 'binary'
    });
    const data = await upload.done();
    return data.Location;
  }

  // 执行方法
  async run(file, config) {
    return this.upload(file, config);
  }
};
