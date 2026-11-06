'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const vision = require('../../src/ai/vision');
const AIClient = require('../../src/ai/client');
const Registry = require('../../src/ai/registry');
const {normalizeChatAttachments, messageImages, messageContent} = require('../../src/service/chat-attachments');
async function picture(format = 'png', width = 2) {
  const data = await sharp({create: {width, height: 2, channels: 3, background: '#f00'}})
    .withExif({IFD0: {Artist: 'private-camera-metadata'}}).toFormat(format).toBuffer();
  return {mimeType: `image/${format}`, data: data.toString('base64')};
}
test('decodes supported images, strips metadata/trailing payloads and preserves actual pixels', async() => {
  for (const format of ['png', 'jpeg', 'webp']) {
    const image = await picture(format);
    const checked = await vision.normalizeImage(image);
    const decoded = sharp(Buffer.from(checked.data, 'base64'));
    const meta = await decoded.metadata();
    assert.equal(meta.width, 2); assert.equal(meta.height, 2);
    assert.equal(meta.exif, undefined); assert.equal(meta.xmp, undefined); assert.equal(meta.icc, undefined);
    const pixels = await decoded.raw().toBuffer();
    assert.ok(pixels[0] > 240 && pixels[1] < 20);
  }
  const image = await picture();
  const data = Buffer.concat([Buffer.from(image.data, 'base64'), Buffer.from('<script>hidden</script>')]);
  const checked = await vision.normalizeImage({...image, data: data.toString('base64')});
  assert.ok(!Buffer.from(checked.data, 'base64').includes(Buffer.from('hidden')));
});
test('rejects corrupt, spoofed, remote, noncanonical, oversized, animated formats and excessive dimensions', async() => {
  const image = await picture();
  for (const value of [null, {...image, mimeType: 'image/svg+xml'}, {...image, mimeType: 'image/gif'},
    {...image, mimeType: 'image/jpeg'}, {...image, data: 'https://example.com/a.png'},
    {...image, data: image.data + '='}, {...image, data: 'A'.repeat(3 * 1024 * 1024)},
    {...image, data: Buffer.from(image.data, 'base64').subarray(0, 40).toString('base64')}, await picture('png', 4097)]) {
    await assert.rejects(vision.normalizeImage(value));
  }
});
test('private attachments keep binary outside prompt text and enforce per-message and history limits', async() => {
  const image = await picture();
  const files = await normalizeChatAttachments([{kind: 'image', name: 'red.png', ...image}, {name: 'a.txt', content: 'reference'}]);
  assert.equal(files[0].size, Buffer.byteLength(files[0].data, 'base64'));
  const message = {role: 'user', content: '看图', attachments: files};
  assert.match(messageContent(message), /reference/);
  assert.ok(!messageContent(message).includes(files[0].data));
  assert.equal(messageImages(message)[0].mimeType, 'image/png');
  assert.throws(() => vision.budget([{role: 'user', images: Array(13).fill(image)}]), /12/);
  assert.throws(() => vision.inputs({role: 'assistant', images: [image]}));
  await assert.rejects(normalizeChatAttachments(Array(6).fill({kind: 'image', name: 'a.png', ...image})), /5/);
  await assert.rejects(normalizeChatAttachments([{kind: 'image', name: '../a.png', ...image}]), /文件名/);
});
test('AI client requires vision independently of image generation and passes sanitized history to the provider', async() => {
  const image = await picture();
  const providers = new Registry();
  let calls = 0;
  providers.register({id: 'demo', models: [
    {id: 'vision', capabilities: ['text', 'vision']}, {id: 'plain', capabilities: ['text', 'image']}
  ], generate(request, context) {
    calls++;
    assert.equal(request.messages[0].images.length, 1);
    assert.equal(context.vision.inputs(request.messages[0])[0].mimeType, 'image/png');
    assert.notEqual(request.messages[0].images[0].data, image.data, 'EXIF removed');
    return {text: 'red'};
  }});
  const client = new AIClient({providers, preferences: {get: async() => ({provider: 'demo', model: 'vision'})}});
  const messages = [{role: 'user', content: '', images: [image]}, {role: 'assistant', content: 'red'}, {role: 'user', content: '再看看'}];
  assert.equal((await client.generate({messages})).text, 'red');
  await assert.rejects(client.generate({model: 'plain', messages}), /不支持图片/);
  await assert.rejects(client.generate({messages: [{role: 'user', content: '', images: [{...image, data: 'bad'}]}]}));
  assert.equal(calls, 1);
});
test('rejects APNG animation declarations rather than silently using the first frame', async() => {
  const image = await picture();
  const bytes = Buffer.from(image.data, 'base64');
  const animation = Buffer.alloc(20);
  animation.writeUInt32BE(8, 0); animation.write('acTL', 4);
  const data = Buffer.concat([bytes.subarray(0, 33), animation, bytes.subarray(33)]).toString('base64');
  await assert.rejects(vision.normalizeImage({...image, data}), /动态图/);
});
test('byte budgets apply independently of text context and before image processing', async() => {
  const pixels = require('node:crypto').randomBytes(600 * 600 * 3);
  const buffer = await sharp(pixels, {raw: {width: 600, height: 600, channels: 3}}).png().toBuffer();
  const image = {mimeType: 'image/png', data: buffer.toString('base64')};
  assert.ok(buffer.length > 1024 * 1024 && buffer.length < 2 * 1024 * 1024);
  assert.throws(() => vision.budget([{role: 'user', images: Array(8).fill(image)}]), /8 MiB/);
  await assert.rejects(normalizeChatAttachments(Array(4).fill({kind: 'image', name: 'noise.png', ...image})), /4 MiB/);
});
