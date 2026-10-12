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
  promisify: fn => fn[require('node:util').promisify.custom] || require('node:util').promisify(fn)
};
const S3Upload = require('../../src/service/upload/s3');

test.after(() => {
  if (originalThink === undefined) delete global.think;
  else global.think = originalThink;
});

test('S3 upload maps Firekylin credentials to an AWS SDK v3 client config', () => {
  const service = new S3Upload();
  const config = service.parseConfig({
    accessKeyId: 'access-key',
    accessKeySecret: 'secret-key',
    region: 'ap-east-1'
  });

  assert.deepEqual(config, {
    region: 'ap-east-1',
    credentials: {
      accessKeyId: 'access-key',
      secretAccessKey: 'secret-key'
    },
    forcePathStyle: true
  });
});

test('S3 upload preserves custom endpoint support', () => {
  const service = new S3Upload();
  const config = service.parseConfig({
    accessKeyId: 'access-key',
    accessKeySecret: 'secret-key',
    region: 's3.example.com'
  });

  assert.equal(config.endpoint, 'http://s3.example.com');
  assert.equal(config.region, 'default');
  assert.equal(config.bucketEndpoint, true);
  assert.equal(config.forcePathStyle, true);
});

test('S3 upload uses the v3 multipart uploader and returns its location', async() => {
  const service = new S3Upload();
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'firekylin-s3-'));
  const filename = path.join(tempDirectory, 'upload');
  await fs.writeFile(filename, 'file contents');

  const client = {};
  let uploadOptions;
  service.getSavePath = () => 'images/upload';
  service.createClient = () => client;
  service.createUpload = (receivedClient, params) => {
    uploadOptions = {client: receivedClient, params};
    return {done: async() => ({Location: 'https://cdn.example.com/images/upload.png'})};
  };

  try {
    const location = await service.uploadMethod(filename, {
      bucket: 'blog-assets',
      prefix: 'images',
      file: {name: 'upload.png'}
    });

    assert.equal(location, 'https://cdn.example.com/images/upload.png');
    assert.equal(uploadOptions.client, client);
    assert.deepEqual(uploadOptions.params, {
      Bucket: 'blog-assets',
      Key: 'images/upload.png',
      ACL: 'public-read',
      Body: Buffer.from('file contents'),
      ContentType: 'binary'
    });
  } finally {
    await fs.rm(tempDirectory, {recursive: true});
  }
});
