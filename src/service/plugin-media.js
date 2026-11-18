'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {randomUUID} = require('node:crypto');
const {uploadMedia} = require('./media-upload');

const MAX_BYTES = 20 * 1024 * 1024;

// Host-only composition. The plugin receives only the manager-bound upload method.
function createPluginMediaApi({getUploadConfig, getUser, canOwnMedia, upload = uploadMedia, audit = () => {}}) {
  const report = entry => {
    // Telemetry must not turn a completed upload into a retryable failure.
    try { audit(entry) } catch { /* Reporting is best effort after the storage outcome is known. */ }
  };
  return Object.freeze({
    async upload(input, {pluginId, assertActive}) {
      if (!input || Object.keys(input).some(key => !['data', 'filename', 'mime', 'ownerId'].includes(key))) {
        throw new TypeError('Invalid media input');
      }
      const {filename, mime} = input;
      const ownerId = Number(input.ownerId);
      if (!Number.isSafeInteger(ownerId) || ownerId <= 0) throw new TypeError('Explicit media owner required');
      if (!Buffer.isBuffer(input.data) || !input.data.length || input.data.length > MAX_BYTES) {
        throw new TypeError('Media must be between 1 byte and 20 MB');
      }
      if (typeof filename !== 'string' || !filename || filename.length > 200 ||
          /[\\/]/.test(filename) || [...filename].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) ||
          ['.', '..'].includes(filename)) {
        throw new TypeError('Invalid media filename');
      }
      if (typeof mime !== 'string' || !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(mime)) {
        throw new TypeError('Invalid media MIME type');
      }
      // Snapshot per-call identity and bytes before awaiting anything; never retain an HTTP request.
      const data = Buffer.from(input.data);
      await assertActive();
      const user = await getUser(ownerId);
      if (!user || Number(user.id) !== ownerId || !canOwnMedia(user)) {
        throw Object.assign(new Error('Media owner is unavailable or not permitted'), {code: 'MEDIA_OWNER_DENIED'});
      }
      const config = await getUploadConfig();
      const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'firekylin-plugin-media-'));
      try {
        const name = randomUUID();
        const localPath = path.join(temporary, name + path.extname(filename));
        await fs.writeFile(localPath, data, {flag: 'wx', mode: 0o600});
        await assertActive();
        // Once transfer starts, finish registration even if the plugin is stopped meanwhile.
        const result = await upload({file: {path: localPath, name: filename, type: mime, size: data.length},
          config: {...config, name}, userId: ownerId});
        report({pluginId, ownerId, ok: true, attachmentId: result.id});
        return result;
      } catch (error) {
        report({pluginId, ownerId, ok: false, code: error.code === 'MEDIA_REGISTRATION_FAILED'
          ? 'MEDIA_REGISTRATION_FAILED' : 'MEDIA_UPLOAD_FAILED'});
        throw error;
      } finally {
        await fs.rm(temporary, {recursive: true, force: true});
      }
    }
  });
}

module.exports = {createPluginMediaApi};
