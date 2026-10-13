const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const originalThink = global.think;
global.think = {
  Service: class {
    init() {}
  },
  UPLOAD_PATH: '',
  UPLOAD_BASE_URL: '/uploads/'
};
const FilesSdkUpload = require('../../src/service/upload/files-sdk');

test.after(() => {
  if (originalThink === undefined) delete global.think;
  else global.think = originalThink;
});

test('maps legacy Firekylin S3 endpoint configuration to files-sdk', () => {
  const service = new FilesSdkUpload();
  const config = service.getAdapterOptions({
    type: 's3',
    bucket: 'blog-assets',
    accessKeyId: 'access-key',
    accessKeySecret: 'secret-key',
    region: 's3.example.com',
    origin: 'https://cdn.example.com'
  });

  assert.deepEqual(config, {
    bucket: 'blog-assets',
    region: 'us-east-1',
    endpoint: 'http://s3.example.com',
    accessKeyId: 'access-key',
    secretAccessKey: 'secret-key',
    publicBaseUrl: 'https://cdn.example.com',
    forcePathStyle: true
  });
});

test('maps the old Tencent credential names without requiring migration', () => {
  const service = new FilesSdkUpload();
  const config = service.getAdapterOptions({
    type: 'tencent',
    bucket: 'images-1250000000',
    region: 'ap-guangzhou',
    secretId: 'secret-id',
    secretKey: 'secret-key',
    origin: 'https://cdn.example.com'
  });

  assert.equal(config.accessKeyId, 'secret-id');
  assert.equal(config.secretAccessKey, 'secret-key');
  assert.equal(config.publicBaseUrl, 'https://cdn.example.com');
});

test('uploads local files through files-sdk and keeps the original extension', async() => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'firekylin-files-sdk-'));
  const uploadDirectory = path.join(tempDirectory, 'uploads');
  const filename = path.join(tempDirectory, 'temporary-file');
  await fs.writeFile(filename, 'file contents');
  global.think.UPLOAD_PATH = uploadDirectory;

  const service = new FilesSdkUpload();
  service.formatNow = () => '20261013';

  try {
    const location = await service.run(filename, {
      type: 'local',
      name: 'cover',
      file: {name: 'photo.png', type: 'image/png'}
    });

    assert.equal(location, '/uploads/20261013/cover.png');
    assert.equal(await fs.readFile(path.join(uploadDirectory, '20261013/cover.png'), 'utf8'), 'file contents');
  } finally {
    await fs.rm(tempDirectory, {recursive: true});
  }
});
