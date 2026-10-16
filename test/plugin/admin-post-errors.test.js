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

test('post API pushes a newly created article using its persisted fields', async() => {
  const controller = new Controller();
  controller.userInfo = {id: 1, type: 1};
  controller.post = () => ({
    pathname: 'hello', markdown_content: '# Hello', options: '{}', status: 3, is_public: 1
  });
  controller.prepareProtection = async data => data;
  controller.commandService = () => ({create: async() => ({id: 42})});
  controller.success = value => value;
  controller.model = name => {
    if (name === 'tag') return {};
    return {
      where() { return this },
      setRelation() { return this },
      async find() { return {id: 42, create_time: '2026-10-16 10:00:00'} }
    };
  };
  let pushed;
  controller.pushPost = async post => { pushed = post };

  assert.deepEqual(await controller.postAction(), {id: 42});
  assert.equal(pushed.id, 42);
  assert.equal(pushed.create_time, '2026-10-16 10:00:00');
});
