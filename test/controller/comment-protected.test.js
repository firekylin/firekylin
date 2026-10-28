'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');

const load = Module._load;
let Controller;
try {
  Module._load = function(name, parent, isMain) {
    if (name === '../base' && parent.filename.endsWith('/api/comment.js')) return class {};
    return load.call(this, name, parent, isMain);
  };
  Controller = require('../../src/controller/api/comment');
} finally { Module._load = load }

function setup({method = 'GET', input = {}, user = null, allowed = false} = {}) {
  const controller = new Controller(); let updated = false;
  const core = {comment: {
    async listRecent() {
      return [{url: '/page/public.html', comment: 'public'}, {url: '/page/secret.html', comment: 'secret'}];
    },
    async update() { updated = true; return {comment: 'secret'} }
  }};
  const service = {create: async() => ({core, users: {}, options: {}, config: {}, tokenService: {}, avatarService: {},
    resolvePostId: async url => url === '/page/public.html' || allowed ? 1 : null}),
  context: async() => ({state: {userInfo: user}}), validateCommentInput() {}, syncCount: async() => {}};
  controller.ctx = {method, host: 'localhost', state: {}, get: () => '',
    throw(status, message) { throw Object.assign(new Error(message), {status}) },
    success(data) { this.body = {errno: 0, data} }};
  controller.get = name => typeof name === 'string' ? ({resource: 'comment', id: '7'})[name] : input;
  controller.post = () => input;
  controller.model = () => ({where: () => ({find: async() => ({id: 7, url: '/page/secret.html'})})});
  controller.service = () => service;
  return {controller, updated: () => updated};
}

test('recent comments exclude records on pages the visitor cannot access', async() => {
  const {controller} = setup({input: {type: 'recent', count: '10'}});
  await controller.indexAction();
  assert.deepEqual(controller.ctx.body.data.map(item => item.comment), ['public']);
});

test('liking a protected comment requires access, while administrators can moderate', async() => {
  const visitor = setup({method: 'PUT', input: {like: true}});
  await visitor.controller.indexAction();
  assert.equal(visitor.controller.ctx.status, 403);
  assert.equal(visitor.updated(), false);
  const admin = setup({method: 'PUT', input: {like: true}, user: {type: 'administrator'}});
  await admin.controller.indexAction();
  assert.equal(admin.updated(), true);
});
