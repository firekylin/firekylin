'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {uploadMedia} = require('../../src/service/media-upload');

const file = {path: '/tmp/voice.ogg', name: 'voice.ogg', type: 'audio/ogg', size: 100};

for (const type of ['local', 'qiniu', 'upyun', 'aliyun', 'tencent', 's3',
  'r2', 'minio', 'backblaze', 'wasabi', 'digitalocean', 'vercel']) {
  test(`uploads and registers audio exactly once with ${type}`, async() => {
    const calls = [];
    const config = {type, name: 'voice'};
    const result = await uploadMedia({file, config, userId: 8}, {
      getUploader: service => ({run: async(filename, options) => {
        assert.equal(service, ['r2', 'minio', 'backblaze', 'wasabi', 'digitalocean', 'vercel']
          .includes(type) ? 'files-sdk' : type);
        assert.equal(filename, file.path);
        assert.deepEqual(options, {...config, file});
        calls.push('upload');
        return '/voice.ogg';
      }}),
      createAttachment: async input => {
        calls.push('register');
        assert.deepEqual(input, {file, url: '/voice.ogg', storage: type, userId: 8});
        return {id: 12};
      }
    });
    assert.deepEqual(result, {url: '/voice.ogg', id: 12});
    assert.deepEqual(calls, ['upload', 'register']);
    assert.deepEqual(config, {type, name: 'voice'});
  });
}

test('rejects missing owners before uploading, never defaults to admin', async() => {
  for (const userId of [undefined, null, 0, -1, 'bad', 1.5]) {
    await assert.rejects(uploadMedia({file, config: {type: 'local'}, userId}), /explicit upload owner/);
  }
});

test('upload failure does not register; registration failure preserves URL and never retries', async() => {
  let uploads = 0;
  let registrations = 0;
  const input = {file, config: {type: 'local'}, userId: 7};
  const cause = new Error('database unavailable');
  const dependencies = {
    getUploader: () => ({run: async() => { uploads++; return '/voice.ogg'; }}),
    createAttachment: async() => { registrations++; throw cause; }
  };
  await assert.rejects(uploadMedia(input, dependencies), error => {
    assert.equal(error.code, 'MEDIA_REGISTRATION_FAILED');
    assert.equal(error.uploadedUrl, '/voice.ogg');
    assert.equal(error.retryable, false);
    assert.equal(error.cause, cause);
    return true;
  });
  assert.equal(uploads, 1);
  assert.equal(registrations, 1);
  dependencies.getUploader = () => ({run: async() => { throw new Error('provider unavailable'); }});
  await assert.rejects(uploadMedia(input, dependencies), /provider unavailable/);
  assert.equal(registrations, 1);
});
