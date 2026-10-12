'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const ToolRegistry = require('../../src/plugin/tools');
const {registerContentTools} = require('../../src/plugin/content-tools');

function harness(rows = []) {
  const queries = [];
  const getModel = () => {
    const query = {conditions: null, fields: null, page: null, limit: null, relation: null};
    queries.push(query);
    const chain = {
      where(value) { query.conditions = value; return this; },
      field(value) { query.fields = value; return this; },
      setRelation(value) { query.relation = value; return this; },
      order() { return this; },
      page(page, limit) { query.page = [page, limit]; return this; },
      limit(value) { query.limit = value; return this; },
      async select() { return rows; },
      async find() { return rows[0] || {}; }
    };
    return chain;
  };
  const registry = new ToolRegistry();
  registerContentTools(registry, {getModel, now: () => '2026-10-12 00:00:00'});
  const call = (name, input) => registry.execute(name, input, {
    authorize: permission => permission === 'posts:read',
    principal: {type: 'public'}
  });
  return {registry, queries, call};
}

test('registers three public, read-only content tools', () => {
  const {registry} = harness();
  assert.deepEqual(registry.list().map(item => item.name), ['posts.list', 'posts.get', 'posts.search']);
  assert.ok(registry.list().every(item => item.requiredPermissions.includes('posts:read')));
});

test('listing queries only publicly published non-future articles', async() => {
  const {queries, call} = harness([{id: 7, title: 'Hello', secret: 'must not be returned'}]);
  assert.deepEqual(await call('posts.list', {page: 2, limit: 5}), [{
    id: 7, title: 'Hello', pathname: undefined, summary: undefined,
    create_time: undefined, update_time: undefined
  }]);
  assert.deepEqual(queries[0].conditions, {
    type: 0, status: 3, is_public: 1, create_time: {'<=': '2026-10-12 00:00:00'}
  });
  assert.deepEqual(queries[0].page, [2, 5]);
  assert.equal(queries[0].relation, false);
});

test('details require positive numeric IDs and filter unpublished content in SQL', async() => {
  const {queries, call} = harness([{id: 8, title: 'Article', markdown_content: '# Hello', password: 'private'}]);
  await assert.rejects(call('posts.get', {}), /Invalid positive integer/);
  await assert.rejects(call('posts.get', {id: '8'}), /Invalid positive integer/);
  const value = await call('posts.get', {id: 8});
  assert.equal(value.markdown_content, '# Hello');
  assert.equal(value.password, undefined);
  assert.equal(queries[0].conditions.id, 8);
  assert.equal(queries[0].conditions.is_public, 1);
  assert.equal(queries[0].conditions.status, 3);
});

test('search includes visibility restrictions and enforces query length', async() => {
  const {queries, call} = harness([]);
  await assert.rejects(call('posts.search', {query: ''}), /Invalid query/);
  await assert.rejects(call('posts.search', {query: 'a'.repeat(121)}), /Invalid query/);
  await assert.rejects(call('posts.search', {query: 'valid', limit: 100}), /Invalid positive integer/);
  await call('posts.search', {query: ' Node.js ', limit: 5});
  assert.deepEqual(queries[0].conditions['title|content'], ['LIKE', '%Node.js%']);
  assert.equal(queries[0].conditions.is_public, 1);
  assert.equal(queries[0].limit, 5);
});

test('all tools fail closed without authorization', async() => {
  const {registry} = harness([]);
  await assert.rejects(registry.execute('posts.list', {}), /Authorization callback required/);
  await assert.rejects(registry.execute('posts.list', {}, {authorize: () => false}), /Permission denied/);
});
