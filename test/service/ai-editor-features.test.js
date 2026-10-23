'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {editorFeatures, normalizeSlug, uniqueSlug} = require('../../src/ai/editor-features');

test('new features require an active AI content plugin and an enabled switch', async() => {
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
