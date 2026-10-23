'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {editorFeatures, normalizeSlug, uniqueSlug} = require('../../src/service/ai-editor-features');

test('features preserve legacy settings without requiring an active plugin', async() => {
  assert.equal((await editorFeatures({})).autocomplete, false);
  const manager = {plugins: new Map([['ai-content', {status: 'active'}]]),
    aiStore: {getCredential: async() => '{"slug":true,"category":true,"autocomplete":false,"title":false}'}};
  const features = await editorFeatures(manager);
  assert.equal(features.slug, true);
  assert.equal(features.category, true);
  assert.equal(features.autocomplete, false);
  assert.equal(features.title, false);
});
test('slug validation rejects invalid output and allocates a unique pathname', async() => {
  assert.equal(normalizeSlug('`Hello World!`'), 'hello-world');
  assert.throws(() => normalizeSlug('中文'), /有效/);
  assert.equal(await uniqueSlug('Hello World', async slug => ['hello-world', 'hello-world-2'].includes(slug)),
    'hello-world-3');
});
test('core settings take precedence and legacy settings migrate without overwriting concurrent saves', async() => {
  const {FEATURES_KEY} = require('../../src/service/ai-editor-features');
  let rows = {};
  const manager = {aiStore: {getCredential: async() => '{"slug":true,"title":false}'}};
  const model = {getOptions: async() => ({...rows}), ensureOption: async(key, value) => {
    if (!Object.hasOwn(rows, key)) rows[key] = value;
    return rows[key];
  }};
  assert.equal((await editorFeatures(manager, model)).slug, true);
  assert.equal(JSON.parse(rows[FEATURES_KEY]).title, false);
  manager.aiStore.getCredential = async() => { throw new Error('Legacy credentials must no longer be read') };
  assert.equal((await editorFeatures(manager, model)).slug, true);
  assert.equal((await editorFeatures(null, model)).title, false);
  rows = {};
  manager.aiStore.getCredential = async() => {
    rows[FEATURES_KEY] = '{"slug":false,"autocomplete":true}';
    return '{"slug":true}';
  };
  assert.equal((await editorFeatures(manager, model)).slug, false);
  assert.equal(JSON.parse(rows[FEATURES_KEY]).autocomplete, true);
});
