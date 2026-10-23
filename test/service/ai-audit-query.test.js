'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('think-model/lib/model');
const Handle = require('think-model-sqlite');
const {migrate, definition} = require('../../src/service/ai-audit-schema');
const query = require('../../src/service/ai-audit-query');
const {Audit} = require('../../src/service/ai-audit');
const context = require('../../src/service/ai-audit-context');

test('SQLite migration, writes, filtering, paginated lists, scoped statistics and deletion use the real ORM', async t => {
  const config = {handle: Handle, path: ':memory:', database: 'audit-test', prefix: 'custom_', logConnect: false, debounce: false};
  const model = () => new Model('ai_audit_log', config);
  const socket = model().db().query.socket();
  t.after(async() => {await socket.pool.drain(); await socket.pool.clear()});
  await migrate({model: model(), config: {type: 'sqlite', sqlite: config}});
  await migrate({model: model(), config: {type: 'sqlite', sqlite: config}});
  const audit = new Audit({model, options: () => ({getOptions: async() => ({ai_audit_settings: '{"recordContent":true}'})})});
  const base = {messages: [{role: 'user', content: 'private text'}]};
  const entries = [];
  await context.run({source: 'admin', user: () => ({id: 1, name: 'admin'})}, async() => {
    for (let i = 0; i < 3; i++) {
      const entry = await audit.start(base, {scenario: i === 2 ? 'editor.title' : 'editor.summary'});
      assert.ok(entry);
      entries.push(entry);
      await audit.resolve(entry, {provider: 'example', model: 'small'});
      await audit.finish(entry, {request: {provider: 'example', model: 'small'}, result: i === 1 ? {text: 'result'} :
        {text: 'result', usage: {prompt_tokens: 3, completion_tokens: 2}}, error: i === 2 ? new Error('fail') : null});
    }
  });
  for (let i = 0; i < entries.length; i++) {
    await model().where({id: entries[i].id}).update({duration_ms: i === 2 ? null : (i + 1) * 100});
  }
  const all = await query.list(model, {});
  assert.equal(all.total, 3);
  assert.equal(all.summary.calls, 3);
  assert.equal(all.summary.average_duration_ms, 150);
  assert.equal(all.summary.success_rate, 2 / 3 * 100);
  assert.equal(all.summary.successes, 2);
  assert.equal(all.summary.failures, 1);
  assert.equal(all.summary.unknown_usage, 1);
  assert.equal(all.summary.total_tokens, 10);
  assert.ok(!('request_text' in all.rows[0]));
  assert.ok(!('response_text' in all.rows[0]));
  const filtered = await query.list(model, {scenario: 'editor.summary', provider: 'example', model: 'small',
    actor_id: '1', status: 'success', from: '2000-01-01', to: '2100-01-01', page: 2, pageSize: 1});
  assert.equal(filtered.rows.length, 1);
  assert.equal(filtered.total, 2);
  assert.equal(filtered.summary.average_duration_ms, 150);
  assert.equal(filtered.summary.success_rate, 100);
  assert.equal(filtered.summary.total_tokens, 5);
  assert.equal(filtered.summary.unknown_usage, 1);
  assert.equal((await query.list(model, {from: '2100-01-01'})).total, 0);
  assert.equal((await model().where({id: entries[0].id}).find()).request_text, 'private text');
  assert.equal(await model().where(query.cleanup({scope: 'filtered', filters: {scenario: 'editor.summary'}})).delete(), 2);
  assert.equal((await query.list(model, {})).total, 1);
  assert.equal((await query.list(model, {})).rows[0].scenario, 'editor.title');
  assert.equal(await model().where(query.cleanup({scope: 'filtered', filters: {}})).delete(), 1);
  const empty = await query.list(model, {});
  assert.equal(empty.summary.total_tokens, null);
  assert.equal(empty.total, 0);
  assert.equal(empty.summary.average_duration_ms, null);
  assert.equal(empty.summary.success_rate, null);
});

test('dialect schema uses configured prefixes and idempotent indexes for all supported backends', async() => {
  for (const type of ['sqlite', 'mysql', 'tidb', 'postgresql']) {
    const sql = [];
    const config = {type, [type]: {prefix: 'blog_'}};
    await migrate({config, model: {query: async statement => {sql.push(statement); return []}}});
    assert.match(sql[0], /CREATE TABLE IF NOT EXISTS blog_ai_audit_log/);
    assert.match(sql[0], type === 'postgresql' ? /SERIAL PRIMARY KEY/ : type === 'sqlite' ? /AUTOINCREMENT/ : /AUTO_INCREMENT/);
    assert.equal(sql.filter(statement => statement.startsWith('CREATE INDEX')).length, 7);
    if (type === 'mysql' || type === 'tidb') {
      assert.equal(sql.filter(statement => statement.startsWith('SHOW INDEX')).length, 7);
      await migrate({config, model: {query: async statement => {
        if (statement.startsWith('CREATE INDEX')) throw Object.assign(new Error('exists'), {code: 'ER_DUP_KEYNAME'});
        return [];
      }}});
    }
  }
  assert.throws(() => definition({type: 'sqlite', sqlite: {prefix: 'bad; DROP TABLE'}}), /prefix/);
  assert.throws(() => definition({type: 'unknown'}), /Unsupported/);
});
test('invalid filters and unbounded cleanup cannot reach the database', () => {
  for (const input of [{status: 'other'}, {actor_id: '1 OR 1=1'}, {from: 'bad'}, {from: '2026-01-01', to: '2025-01-01'}]) {
    assert.throws(() => query.filters(input), {status: 400});
  }
  for (const input of [{}, {ids: []}, {ids: [-1]}, {ids: [1], before: '2026-01-01'}, {before: 'invalid'}, {scope: 'filtered'}, {scope: 'filtered', filters: {page: 1}},
    {scope: 'filtered', filters: {status: false}}, {scope: 'filtered', filters: []},
    {scope: 'filtered', filters: {status: 'invalid'}}, {scope: 'filtered', filters: {}, ids: [1]}]) {
    assert.throws(() => query.cleanup(input), {status: 400});
  }
  for (const input of [{pageSize: 1000}, {page: -1}, {page: 'bad'}]) assert.throws(() => query.pagination(input), {status: 400});
});

test('abnormal process exit preserves durable unfinished metadata', async t => {
  const {mkdtemp, rm} = require('node:fs/promises');
  const {tmpdir} = require('node:os');
  const path = require('node:path');
  const {fork} = require('node:child_process');
  const {once} = require('node:events');
  const directory = await mkdtemp(path.join(tmpdir(), 'firekylin-ai-audit-'));
  const child = fork(path.join(__dirname, '../fixtures/ai-audit-crash.js'), [directory], {stdio: ['ignore', 'ignore', 'ignore', 'ipc']});
  t.after(async() => {if (child.exitCode === null && !child.killed) child.kill('SIGKILL'); await rm(directory, {recursive: true, force: true})});
  const exited = once(child, 'exit');
  await Promise.race([once(child, 'message'), exited.then(() => {throw new Error('fixture exited before recording')})]);
  child.kill('SIGKILL');
  await exited;
  const model = new Model('ai_audit_log', {handle: Handle, path: directory, database: 'audit-crash', prefix: 'test_', logConnect: false});
  const socket = model.db().query.socket();
  try {
    const row = await model.find();
    assert.equal(row.status, 'unfinished');
    assert.equal(row.provider, 'example');
    assert.equal(row.model, 'small');
    assert.equal(row.request_text, null);
    assert.equal(row.actor_name, '系统任务');
  } finally {await socket.close()}
});
