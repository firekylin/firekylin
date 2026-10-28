'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');

const load = Module._load;
let Controller;
try {
  Module._load = function(name, parent, isMain) {
    if (name === './post' && parent.filename.endsWith('/admin/api/page.js')) return class {};
    return load.call(this, name, parent, isMain);
  };
  Controller = require('../../src/controller/admin/api/page');
} finally { Module._load = load }

test('page detail reveals password state but never the stored hash', async() => {
  const previous = global.think;
  global.think = {isEmpty: value => !value || !Object.keys(value).length};
  try {
    const instance = Object.create(Controller.prototype);
    instance.id = 7;
    instance.modelInstance = {where: () => ({find: async() => ({id: 7,
      options: JSON.stringify({postPasswordHash: 'secret-hash', fields: {cover: '/cover'}})})})};
    instance.success = value => value;
    const result = await instance.getAction();
    assert.equal(result.options.passwordProtected, true);
    assert.equal(result.options.postPasswordHash, undefined);
    assert.equal(result.options.fields.cover, '/cover');
  } finally { global.think = previous }
});
