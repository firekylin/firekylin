'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const FORMATS = {
  png: {mime: 'image/png', extension: '.png'},
  jpeg: {mime: 'image/jpeg', extension: '.jpg'},
  gif: {mime: 'image/gif', extension: '.gif'}
};

function matchesSignature(buffer, format) {
  if (format === 'png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  if (format === 'jpeg') return buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'));
  if (format === 'gif') return buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString());
  return false;
}

function registerMediaTools(registry, {getUploadConfig, getUploader}) {
  if (typeof getUploadConfig !== 'function' || typeof getUploader !== 'function') throw new TypeError('Media dependencies required');
  registry.register({
    name: 'media.upload',
    description: 'Upload a PNG, JPEG or GIF image from base64 data; remote URLs are not supported',
    requiredPermissions: ['media:write'],
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: {
        name: {type: 'string', minLength: 1, maxLength: 100},
        format: {type: 'string', enum: Object.keys(FORMATS)},
        base64: {type: 'string', minLength: 1}
      },
      required: ['name', 'format', 'base64']
    },
    async execute(input, context) {
      if (!context.principal || !Number.isSafeInteger(Number(context.principal.id))) {
        throw new Error('Authenticated principal required');
      }
      if (!input || typeof input !== 'object' || Array.isArray(input) ||
          Object.keys(input).some(key => !['name', 'format', 'base64'].includes(key))) {
        throw new TypeError('Invalid upload input');
      }
      const format = FORMATS[input.format];
      if (!format) throw new TypeError('Unsupported image format');
      if (typeof input.name !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(input.name)) {
        throw new TypeError('Invalid image name');
      }
      if (typeof input.base64 !== 'string' || input.base64.length > 7 * 1024 * 1024 ||
          !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.base64)) {
        throw new TypeError('Invalid base64 image');
      }
      const bytes = Buffer.from(input.base64, 'base64');
      if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024 || !matchesSignature(bytes, input.format)) {
        throw new TypeError('Invalid image signature or size');
      }

      const config = await getUploadConfig();
      if (!config || !['local', 'qiniu', 'upyun', 'oss', 'cos', 's3'].includes(config.type)) {
        throw new Error('Configured upload provider is not supported');
      }
      const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'firekylin-ai-upload-'));
      const filename = path.join(temporary, 'image' + format.extension);
      try {
        await fs.writeFile(filename, bytes, {flag: 'wx', mode: 0o600});
        const uploadConfig = {...config, name: input.name, file: {
          name: input.name + format.extension, path: filename, size: bytes.length, type: format.mime
        }};
        return await getUploader(config.type).run(filename, uploadConfig);
      } finally {
        await fs.rm(temporary, {recursive: true, force: true});
      }
    }
  }, 'core-management');
}

module.exports = {registerMediaTools};
