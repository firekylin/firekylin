const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');
const load = Module._load;
let Controller;
try {
  Module._load = function(name, parent, isMain) {
    if (name === './base' && parent.filename.endsWith('/admin/api/post.js')) return class {};
    return load.call(this, name, parent, isMain);
  };
  Controller = require('../../src/controller/admin/api/post');
} finally { Module._load = load }

test('post API translates domain failures without masking unexpected errors', async() => {
  for (const action of ['postAction', 'putAction', 'deleteAction']) {
    const controller = new Controller();
    controller.id = 1;
    controller.post = () => ({title: 'Test'});
    controller.fail = code => ({error: code});
    controller.commandService = () => Object.fromEntries(['create', 'update', 'remove'].map(name => [
      name, async() => { throw new Error('PATHNAME_EXIST') }
    ]));
    assert.deepEqual(await controller[action](), {error: 'PATHNAME_EXIST'});
    controller.commandService = () => Object.fromEntries(['create', 'update', 'remove'].map(name => [
      name, async() => { throw new Error('database unavailable') }
    ]));
    await assert.rejects(controller[action](), /database unavailable/);
  }
});
