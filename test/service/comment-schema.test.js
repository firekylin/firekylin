'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const originalThink = global.think;
global.think = {
  Service: class {},
  config: key => key === 'model' ? {type: 'sqlite', sqlite: {prefix: ''}} : undefined
};
const CommentSchema = require('../../src/service/comment-schema');

test.after(() => {
  if (originalThink === undefined) delete global.think;
  else global.think = originalThink;
});

test('comment schema migrates once and records its version', async() => {
  const state = {site_url: 'https://example.com'};
  const updates = [];
  const queries = [];
  const options = {
    async getOptions() { return {...state} },
    async updateOptions(key, value) { state[key] = value; updates.push([key, value]) }
  };
  const commentModel = {
    async query(sql) { queries.push(sql) },
    where() { return this },
    field() { return this },
    async select() { return [] },
    async update() { return 0 }
  };
  const postModel = {field() { return this }, async select() { return [] }};
  const service = new CommentSchema();
  service.model = name => name === 'options' ? options : name === 'post' ? postModel : commentModel;

  assert.equal(await service.migrate({skipIfUninstalled: true}), true);
  assert.equal(state.comment_schema_version, '3');
  assert.match(state.jwt_secret, /^[a-f0-9]{64}$/);
  assert.ok(queries.some(sql => sql.includes('CREATE TABLE IF NOT EXISTS comment ')));
  assert.ok(queries.some(sql => sql.includes('comment_post_idx')));
  assert.ok(queries.some(sql => sql.includes('CREATE TABLE IF NOT EXISTS user_social')));
  assert.ok(queries.some(sql => sql.includes('user_social_account_idx')));
  assert.ok(updates.some(([key]) => key === 'jwt_secret'));

  const queryCount = queries.length;
  assert.equal(await service.migrate({skipIfUninstalled: true}), false);
  assert.equal(queries.length, queryCount);
});

test('comment schema backfills post ids from legacy pathnames', async() => {
  const updates = [];
  const commentModel = {
    async query() {},
    where(value) { this.currentWhere = value; return this },
    field() { return this },
    async select() { return [{id: 3, url: '/post/hello.html'}, {id: 4, url: '/missing'}] },
    async update(value) { updates.push([this.currentWhere, value]) }
  };
  const postModel = {field() { return this }, async select() { return [{id: 9, type: 0, pathname: 'hello'}] }};
  const options = {
    async getOptions() { return {site_url: 'https://example.com', comment_schema_version: '1', comment_jwt_secret: 'legacy-secret-with-minimum-32-bytes-long'} },
    async updateOptions(key, value) { if (key === 'jwt_secret') assert.equal(value, 'legacy-secret-with-minimum-32-bytes-long') }
  };
  const service = new CommentSchema();
  service.model = name => name === 'options' ? options : name === 'post' ? postModel : commentModel;

  await service.migrate();
  assert.deepEqual(updates, [[{id: 3}, {post_id: 9}]]);
});

test('startup migration skips a database that has not been installed', async() => {
  const service = new CommentSchema();
  service.model = () => ({
    async getOptions() { throw new Error('SQLITE_ERROR: no such table: fk_options') }
  });

  assert.equal(await service.migrate({skipIfUninstalled: true}), false);
});
