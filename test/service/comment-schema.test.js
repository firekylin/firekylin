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
  const service = new CommentSchema();
  service.model = name => name === 'options' ? options : {query: async sql => queries.push(sql)};

  assert.equal(await service.migrate({skipIfUninstalled: true}), true);
  assert.equal(state.comment_schema_version, '1');
  assert.match(state.comment_jwt_secret, /^[a-f0-9]{64}$/);
  assert.ok(queries.some(sql => sql.includes('CREATE TABLE IF NOT EXISTS comment ')));
  assert.ok(updates.some(([key]) => key === 'comment_jwt_secret'));

  const queryCount = queries.length;
  assert.equal(await service.migrate({skipIfUninstalled: true}), false);
  assert.equal(queries.length, queryCount);
});

test('startup migration skips a database that has not been installed', async() => {
  const service = new CommentSchema();
  service.model = () => ({
    async getOptions() { throw new Error('SQLITE_ERROR: no such table: fk_options') }
  });

  assert.equal(await service.migrate({skipIfUninstalled: true}), false);
});
