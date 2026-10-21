'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const content = require('../../src/ability/content');
const management = require('../../src/ability/management');
const media = require('../../src/ability/media/upload');

test('legacy tool modules are compatibility aliases for ability modules', () => {
  assert.equal(require('../../src/plugin/content-tools').registerContentTools,
    content.registerContentAbilities);
  assert.equal(require('../../src/plugin/management-tools').registerManagementTools,
    management.registerManagementAbilities);
  assert.equal(require('../../src/plugin/media-tools').registerMediaTools,
    media.registerMediaAbilities);
});

test('managed post abilities have independent domain modules', () => {
  const dependencies = {getModel: () => ({}), now: () => ''};
  assert.equal(require('../../src/ability/management/posts/list-managed')(dependencies).name,
    'posts.list_managed');
  assert.equal(require('../../src/ability/management/posts/get-managed')(dependencies).name,
    'posts.get_managed');
});
