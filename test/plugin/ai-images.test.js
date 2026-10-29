'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const images = require('../../src/ai/images');
const AIClient = require('../../src/ai/client');
const Registry = require('../../src/ai/registry');
const image = {mimeType: 'image/png', data: 'YWJj'};

test('core validates and converts image inputs and outputs', () => {
  assert.deepEqual(images.inputs({images: [image]}, 1), [image]);
  assert.equal(images.uri(image), 'data:image/png;base64,YWJj');
  assert.equal(images.prompt({messages: [{content: 'draw'}, {content: 'a cat'}]}), 'draw\na cat');
  assert.deepEqual(images.output({data: [{b64_json: 'YWJj'}]}, 'image/png'), [image]);
  for (const invalid of [null, {...image, mimeType: 'text/html'}, {...image, data: ''}, {...image, data: '???'}]) {
    assert.throws(() => images.image(invalid), /Invalid image/);
  }
  assert.throws(() => images.inputs({images: [image, image]}, 1), /At most 1/);
  assert.throws(() => images.output({}, 'image/png'), /no image/);
  assert.throws(() => images.prompt({messages: [{content: ' '}]}), /prompt/);
  assert.equal(Object.isFrozen(images), true);
});
test('provider receives core image helpers through generation context', async() => {
  const providers = new Registry();
  providers.register({id: 'image', models: [{id: 'model', capabilities: ['image']}],
    generate(request, context) {
      assert.equal(context.images, images);
      return {images: context.images.inputs(request)};
    }}, 'plugin');
  const client = new AIClient({providers, preferences: {get: async() => ({provider: 'image', model: 'model'})}});
  assert.deepEqual(await client.generate({capability: 'image', messages: [{role: 'user', content: 'cat'}], images: [image]},
    {images: {untrusted: true}}), {images: [image]});
});
