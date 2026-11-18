'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const util = require('node:util');

test('upload preserves the URL response and optionally returns its attachment ID', async() => {
  const oldThink = global.think;
  const originalLoad = Module._load;
  const rows = [];
  global.think = {
    model: () => ({addPost: async row => { rows.push(row); return {id: 42}; }}),
    datetime: () => '2026-11-18 12:00:00',
    uuid: () => 'attachment',
    promisify: fn => util.promisify(fn),
    service: () => ({run: async() => '/uploads/photo.jpg'}),
    isPrevent: () => false
  };
  try {
    Module._load = function(name, parent, main) {
      if (name === './base' && parent.filename.endsWith('/admin/api/file.js')) return class {};
      return originalLoad.call(this, name, parent, main);
    };
    const Controller = require('../../src/controller/admin/api/file');
    const controller = Object.create(Controller.prototype);
    controller.userInfo = {id: 9};
    controller.success = value => value;
    controller.fail = value => { throw new Error(value) };
    controller.post = () => undefined;
    const config = {file: {name: 'photo.jpg'}};
    assert.equal(await controller.serviceUpload('local', '/tmp/photo.jpg', config), '/uploads/photo.jpg');
    controller.post = name => name === 'attachmentInfo' ? '1' : undefined;
    assert.deepEqual(await controller.serviceUpload('local', '/tmp/photo.jpg', config),
      {url: '/uploads/photo.jpg', id: 42});
    assert.equal(rows.length, 2);
    assert.ok(rows.every(row => row.user_id === 9));
  } finally {
    Module._load = originalLoad;
    global.think = oldThink;
  }
});
