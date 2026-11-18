'use strict';

const {createAttachment} = require('./media-attachment');

const SDK_PROVIDERS = ['r2', 'minio', 'backblaze', 'wasabi', 'digitalocean', 'vercel'];
const PROVIDERS = ['local', 'qiniu', 'upyun', 'aliyun', 'tencent', 's3', ...SDK_PROVIDERS];

// Trusted server API. Callers enforce their own authorization, type and size limits.
async function uploadMedia({file, config, userId}, dependencies = {}) {
  userId = Number(userId);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new TypeError('An explicit upload owner is required');
  }
  if (!file || !file.path || !file.name) throw new TypeError('Upload file metadata required');
  if (!config || !PROVIDERS.includes(config.type)) {
    throw new Error('Configured upload provider is not supported');
  }
  const getUploader = dependencies.getUploader || (type => think.service('upload/' + type));
  const register = dependencies.createAttachment || (input => createAttachment(input, {
    getModel: () => think.model('post'),
    now: () => think.datetime(),
    uuid: () => think.uuid(20)
  }));
  const service = SDK_PROVIDERS.includes(config.type) ? 'files-sdk' : config.type;
  const url = await getUploader(service).run(file.path, {...config, file});
  try {
    const attachment = await register({url, file, storage: config.type, userId});
    return {url, id: attachment.id};
  } catch (cause) {
    // The write may have committed before failing. Never delete the object or
    // retry either step automatically: inspect/reconcile the URL first.
    const error = new Error('MEDIA_REGISTRATION_FAILED: File uploaded but media registration failed; ' +
      'do not retry the upload automatically. Inspect the uploaded URL before retrying.', {cause});
    error.code = 'MEDIA_REGISTRATION_FAILED';
    error.uploadedUrl = url;
    error.storage = config.type;
    error.retryable = false;
    throw error;
  }
}

module.exports = {uploadMedia};
