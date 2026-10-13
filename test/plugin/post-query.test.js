'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const PostQueryService = require('../../src/service/post-query');

function harness(result = []) {
  const calls = [];
  const getModel = () => {
    const state = {where: null, fields: null, page: null, joined: false};
    calls.push(state);
    return {
      config: {prefix: 'fk_'},
      where(where) { state.where = where; return this; },
      field(fields) { state.fields = fields; return this; },
      order() { return this; },
      setRelation() { return this; },
      page(page, size) { state.page = [page, size]; return this; },
      join() { state.joined = true; return this; },
      limit() { return this; },
      async countSelect() { return {data: result, count: result.length}; },
      async find() { return result[0] || {}; },
      async select() { return result; }
    };
  };
  const service = new PostQueryService({getModel, now: () => '2026-10-12 00:00:00'});
  return {service, calls};
}

test('admin list shares author and status filters, preserves pagination', async() => {
  const {service, calls} = harness();
  await service.listAdmin({
    userInfo: {id: 12, type: 2}, keyword: ':private hello', page: 3, pageSize: 20
  });
  assert.equal(calls[0].where.type, 0);
  assert.equal(calls[0].where.user_id, 12);
  assert.equal(calls[0].where.is_public, 0);
  assert.deepEqual(calls[0].where.status, ['!=', 4]);
  assert.deepEqual(calls[0].where.title, ['like', ['%hello%']]);
  assert.deepEqual(calls[0].page, [3, 20]);
});

test('admin article detail respects owner while admin can access any author', async() => {
  const {service, calls} = harness([{id: 5}]);
  await service.getAdmin(5, {id: 12, type: 2});
  assert.deepEqual(calls[0].where, {type: 0, id: 5, user_id: 12});
  await service.getAdmin(5, {id: 1, type: 1});
  assert.deepEqual(calls[1].where, {type: 0, id: 5});
});

test('public reads always enforce publication and visibility', async() => {
  const {service, calls} = harness();
  await service.listPublic({page: 1, limit: 10});
  await service.getPublic(5);
  await service.searchPublic({query: 'Node.js', limit: 5});
  for (const call of calls) {
    assert.equal(call.where.type, 0);
    assert.equal(call.where.status, 3);
    assert.equal(call.where.is_public, 1);
    assert.deepEqual(call.where.create_time, {'<=': '2026-10-12 00:00:00'});
  }
  assert.equal(calls[1].where.id, 5);
  assert.deepEqual(calls[2].where['title|content'], ['LIKE', '%Node.js%']);
});

test('public reads redact password-protected article content', async() => {
  const protectedPost = {
    id: 8,
    title: 'Protected',
    summary: 'Secret summary',
    markdown_content: 'Secret markdown',
    options: JSON.stringify({postPasswordHash: 'scrypt$salt$hash'})
  };
  const {service} = harness([protectedPost]);
  const list = await service.listPublic();
  const detail = await service.getPublic(8);

  assert.equal(list[0].summary, '这篇文章受密码保护。');
  assert.equal(list[0].options, undefined);
  assert.equal(detail.markdown_content, undefined);
  assert.equal(detail.password_protected, true);
});
