'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const test = require('node:test');
const ToolRegistry = require('../../src/plugin/tools');
const {registerMediaTools} = require('../../src/plugin/media-tools');

test('media.upload validates encoding, name and signature before writing', async() => {
  const registry = new ToolRegistry();
  let uploaded = false;
  registerMediaTools(registry, {
    getUploadConfig: async() => ({type: 'local'}),
    getUploader: () => ({async run() {uploaded = true; return '/uploads/example.png';}})
  });
  const run = input => registry.execute('media.upload', input, {
    principal: {id: 1, type: 1},
    authorize: permission => permission === 'media:write'
  });
  await assert.rejects(run({name: '../escape', format: 'png', base64: 'AAAA'}), /Invalid image name/);
  await assert.rejects(run({name: 'image', format: 'png', base64: 'AAAA'}), /Invalid image signature/);
  await assert.rejects(run({name: 'image', format: 'png', base64: 'not-base64!!'}), /Invalid base64/);
  assert.equal(uploaded, false);
});

test('media.upload delegates validated bytes to configured uploader and removes temporary file', async() => {
  const registry = new ToolRegistry();
  let path;
  registerMediaTools(registry, {
    getUploadConfig: async() => ({type: 'local'}),
    getUploader: () => ({
      async run(filename, config) {
        path = filename;
        const contents = await fs.readFile(filename);
        assert.equal(contents.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(config.name, 'image');
        return '/uploads/image.png';
      }
    })
  });
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  const result = await registry.execute('media.upload', {
    name: 'image', format: 'png', base64: png
  }, {principal: {id: 1, type: 1}, authorize: () => true});
  assert.equal(result, '/uploads/image.png');
  await assert.rejects(fs.access(path), {code: 'ENOENT'});
});

test('media upload requires explicit media:write privilege', async() => {
  const registry = new ToolRegistry();
  registerMediaTools(registry, {
    getUploadConfig: async() => ({type: 'local'}),
    getUploader: () => ({run: async() => 'url'})
  });
  await assert.rejects(registry.execute('media.upload', {
    name: 'image', format: 'png', base64: 'AAAA'
  }, {principal: {id: 1}, authorize: () => false}), /Permission denied/);
});


test('configured providers use their actual upload service identifiers', async() => {
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  for (const type of ['local', 'qiniu', 'upyun', 'aliyun', 'tencent', 's3', 'r2', 'minio', 'backblaze', 'wasabi', 'digitalocean', 'vercel']) {
    const registry = new ToolRegistry();
    registerMediaTools(registry, {
      getUploadConfig: async() => ({type}),
      getUploader: actual => {
        assert.equal(actual, ['r2', 'minio', 'backblaze', 'wasabi', 'digitalocean', 'vercel'].includes(type) ? 'files-sdk' : type);
        return {run: async() => 'uploaded'};
      }
    });
    assert.equal(await registry.execute('media.upload', {name: 'image', format: 'png', base64: png}, {
      principal: {id: 1, type: 1}, authorize: () => true
    }), 'uploaded');
  }
});
