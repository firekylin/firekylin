const {test} = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const original = Module._load;
let Controller;
Module._load = function(id, parent, ...rest) {
  if (parent?.filename.endsWith('/ai-image.js') && id === './base') return class {};
  if (parent?.filename.endsWith('/ai-image.js') && id.includes('admin-auth')) return {csrfToken: () => 'csrf'};
  return original.call(this, id, parent, ...rest);
};
try { Controller = require('../../src/controller/admin/api/ai-image') } finally { Module._load = original }
function setup(enabled) {
  const controller = new Controller();
  controller.ctx = {get: () => 'csrf'};
  controller.model = () => ({getOptions: async() => ({ai_content_features: JSON.stringify({image: enabled})})});
  controller.post = () => ({prompt: '猫'});
  controller.fail = message => ({error: message});
  controller.success = data => ({data});
  return controller;
}
test('image generation is disabled by default', async() => {
  assert.match((await setup(false).postAction()).error, /尚未开启/);
});
test('image generation selects image capable model and preserves output', async() => {
  const image = {mimeType: 'image/png', data: 'YWJj'};
  global.firekylin = {plugins: {ai: {
    models: async() => [{id: 'gemini', configured: true, models: [{id: 'image', capabilities: ['image']}]}],
    generate: async request => {assert.equal(request.capability, 'image'); return {images: [image]}}
  }}};
  try { assert.deepEqual((await setup(true).postAction()).data, image) } finally { delete global.firekylin }
});

test('successful response termination is not converted into an error response', async() => {
  const image = {mimeType: 'image/png', data: 'YWJj'};
  global.firekylin = {plugins: {ai: {
    models: async() => [{id: 'openai', models: [{id: 'image', capabilities: ['image']}]}],
    generate: async() => ({images: [image]})
  }}};
  const controller = setup(true);
  const prevent = new Error('PREVENT_NEXT_PROCESS');
  let sent;
  controller.success = data => {sent = data; throw prevent};
  controller.fail = () => assert.fail('success must not become a failure');
  try {
    await assert.rejects(controller.postAction(), error => error === prevent);
    assert.deepEqual(sent, image);
  } finally {delete global.firekylin}
});
test('missing image provider sends only one failure response', async() => {
  const controller = setup(true);
  const prevent = new Error('PREVENT_NEXT_PROCESS');
  let failures = 0;
  controller.fail = message => {failures++; assert.match(message, /请先配置/); throw prevent};
  try {await assert.rejects(controller.postAction(), error => error === prevent); assert.equal(failures, 1)}
  finally {delete global.firekylin}
});
test('provider failures retain their original message', async() => {
  global.firekylin = {plugins: {ai: {
    models: async() => [{id: 'openai', models: [{id: 'image', capabilities: ['image']}]}],
    generate: async() => {throw new Error('provider unavailable')}
  }}};
  try {assert.deepEqual(await setup(true).postAction(), {error: 'provider unavailable'})}
  finally {delete global.firekylin}
});
