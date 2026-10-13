const fs = require('fs');
const path = require('path');
const Base = require('./base');

const filesSdkModule = import('./files-sdk-providers.mjs');

function clean(value) {
  return typeof value === 'string' ? value.trim() : value;
}

module.exports = class extends Base {
  async createFiles(config) {
    const {Files, providers} = await filesSdkModule;
    const provider = providers[config.type];
    if (!provider) throw new Error(`UPLOAD_PROVIDER_NOT_SUPPORTED: ${config.type}`);

    const adapter = provider(this.getAdapterOptions(config));
    return new Files({
      adapter,
      prefix: clean(config.prefix) || undefined
    });
  }

  getAdapterOptions(config) {
    const type = config.type;
    const publicBaseUrl = clean(config.origin) || undefined;

    if (type === 'local') {
      return {
        root: think.UPLOAD_PATH,
        urlBaseUrl: think.UPLOAD_BASE_URL || '/static/upload/'
      };
    }

    if (type === 'vercel') {
      return {
        token: clean(config.token) || undefined,
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true
      };
    }

    const common = {
      bucket: clean(config.bucket),
      region: clean(config.region) || undefined,
      endpoint: clean(config.endpoint) || undefined,
      accessKeyId: clean(config.accessKeyId) || undefined,
      secretAccessKey: clean(config.accessKeySecret) || undefined,
      publicBaseUrl
    };

    if (type === 'aliyun') {
      common.region = common.region && common.region.replace(/^oss-/, '');
      return common;
    }
    if (type === 'tencent') {
      common.accessKeyId = clean(config.secretId) || common.accessKeyId;
      common.secretAccessKey = clean(config.secretKey) || common.secretAccessKey;
      return common;
    }
    if (type === 'r2') {
      delete common.region;
      common.accountId = clean(config.accountId) || undefined;
      return common;
    }
    if (type === 'minio') {
      common.forcePathStyle = true;
      return common;
    }
    if (type === 's3' && !common.endpoint && /\.\w+$/.test(common.region || '')) {
      // Compatibility with Firekylin's former "region or endpoint" field.
      common.endpoint = this.getAbsOrigin(common.region);
      common.region = 'us-east-1';
      common.forcePathStyle = true;
    }
    if (type === 's3' && !common.publicBaseUrl) {
      common.publicBaseUrl = common.endpoint
        ? `${common.endpoint.replace(/\/$/, '')}/${common.bucket}`
        : `https://${common.bucket}.s3.${common.region}.amazonaws.com`;
    }
    return common;
  }

  getKey(filename, config) {
    const originalName = (config.file && config.file.name) || path.basename(filename);
    const ext = path.extname(originalName);
    const stem = path.basename(filename, path.extname(filename));
    const requestedName = config.name && path.basename(config.name);
    const name = requestedName ? `${requestedName}${path.extname(requestedName) ? '' : ext}` : `${stem}${ext}`;
    return `${this.formatNow()}/${name.replace(/[\\/]/g, '')}`;
  }

  async run(filename, config) {
    const files = await this.createFiles(config);
    const key = this.getKey(filename, config);
    const body = await fs.promises.readFile(filename);
    await files.upload(key, body, {
      contentType: (config.file && config.file.type) || 'application/octet-stream'
    });
    if (config.type === 'local') {
      await fs.promises.unlink(filename).catch(() => {});
    }
    return files.url(key);
  }
};
