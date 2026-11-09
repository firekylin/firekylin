'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const Model = require('think-model/lib/model');

const helper = createRequire(require.resolve('think-model'))('think-helper');
const handle = require('think-model-sqlite');

const Koa = createRequire(require.resolve('thinkjs'))('koa');
const {once} = require('node:events');
const cache = require('../../src/service/options-request-cache');
const middleware = require('../../src/middleware/options-request-cache');

global.think = {...helper, Model};
const OptionsModel = require('../../src/model/options');

let sequence = 0;
async function setup(t) {
  const sql = [];
  const config = {handle, type: 'sqlite', path: ':memory:', database: `options-cache-${++sequence}`,
    prefix: 'test_', logConnect: false, logSql: true, debounce: false, logger: value => sql.push(value)};
  // Use ThinkJS's real factories: every controller/service/think.model call
  // reparses config and constructs a fresh model, not one shared mock instance.
  const extension = require('think-model')({on() {}, modules: [], models: {options: OptionsModel},
    think: {config: name => name === 'model' ? {type: 'sqlite', sqlite: config} : {}}});
  const factory = () => extension.think.model('options');
  const model = factory();
  t.after(() => model.db().query.socket().close());
  await model.execute('CREATE TABLE test_options (key TEXT PRIMARY KEY, value TEXT)');
  await model.addMany([
    {key: 'title', value: 'Original'},
    {key: 'site_url', value: 'https://example.com'},
    {key: 'jwt_secret', value: 'test-secret'},
    {key: 'comment_jwt_secret', value: 'test-comment-secret'},
    {key: 'comment_schema_version', value: '1'},
    {key: 'ai_credentials', value: 'test-legacy-credential'},
    {key: 'ai_credential_demo', value: 'test-credential'},
    {key: 'comment', value: '{"smtpPass":"test-mail-secret","meta":["nick"],"name":"old"}'},
    {key: 'upload', value: '{"type":"local","nested":{"value":1}}'},
    {key: 'captcha', value: '{"provider":"turnstile","secret":"test-captcha-secret","areas":["login"]}'},
    {key: 'push_sites', value: '{"demo":{"url":"https://example.com"}}'},
    {key: 'rssImportList', value: '[{"url":"https://example.com/feed"}]'}
  ]);
  const selects = () => sql.filter(line => /^SQL: SELECT \* FROM test_options(?:,|$)/.test(line)).length;
  sql.length = 0;
  return {factory, model, config, sql, selects, extension};
}

test('deduplicates sequential and concurrent reads across real ThinkJS model factories', async t => {
  const {factory, selects, extension, config} = await setup(t);
  await cache.run(async() => {
    const context = {config: name => name === 'model' ? {type: 'sqlite', sqlite: config} : {}};
    const controller = {ctx: {model: extension.context.model.bind(context)}};
    const [first, second, third] = await Promise.all([
      factory().getOptions(), extension.service.model('options').getOptions(true),
      extension.controller.model.call(controller, 'options').getOptions()
    ]);
    assert.equal(first.title, 'Original');
    assert.equal(second.jwt_secret, 'test-secret');
    assert.equal(third.jwt_secret, undefined);
    for (let n = 0; n < 20; n++) await factory().getOptions(n % 2 === 0);
    assert.equal(selects(), 1, '23 reads must execute one full options SELECT');
  });
  await cache.run(() => factory().getOptions());
  assert.equal(selects(), 2, 'the next request queries again');
});

test('keeps nested objects and public/private filtering independent in both orders', async t => {
  const {factory, selects} = await setup(t);
  for (const privateFirst of [true, false]) await cache.run(async() => {
    const first = await factory().getOptions(privateFirst);
    first.comment.meta.push('mutated');
    first.upload.nested.value = 9;
    first.captcha.areas.push('mutated');
    first.push_sites.demo.url = 'changed';
    first.rssImportList[0].url = 'changed';
    delete first.jwt_secret;
    const privateOptions = await factory().getOptions(true);
    const publicOptions = await factory().getOptions();
    assert.deepEqual(privateOptions.comment.meta, ['nick']);
    assert.equal(privateOptions.comment.smtpPass, 'test-mail-secret');
    assert.equal(privateOptions.captcha.secret, 'test-captcha-secret');
    assert.equal(privateOptions.upload.nested.value, 1);
    assert.deepEqual(privateOptions.captcha.areas, ['login']);
    assert.equal(privateOptions.push_sites.demo.url, 'https://example.com');
    assert.equal(privateOptions.rssImportList[0].url, 'https://example.com/feed');
    assert.equal(privateOptions.ai_credential_demo, 'test-credential');
    for (const key of ['jwt_secret', 'comment_jwt_secret', 'comment_schema_version',
      'ai_credentials', 'ai_credential_demo']) assert.equal(publicOptions[key], undefined);
    assert.equal(publicOptions.comment.smtpPass, undefined);
    assert.equal(publicOptions.captcha.secret, undefined);
    assert.equal(publicOptions.comment.name, undefined);
  });
  assert.equal(selects(), 2);
});

test('isolates object-valued adapter rows, including unknown custom configuration', async() => {
  class Adapter { constructor() { this.query = {} } }
  const model = new OptionsModel('options', {handle: Adapter});
  const data = [{key: 'custom', value: {nested: [1]}}, {key: 'comment', value: {meta: ['nick']}}];
  let calls = 0;
  model.select = async() => { calls++; return data };
  await cache.run(async() => {
    const first = await model.getOptions();
    first.custom.nested.push(2);
    first.comment.meta.push('changed');
    assert.deepEqual((await model.getOptions(true)).custom.nested, [1]);
    assert.deepEqual(data[1].value.meta, ['nick']);
  });
  assert.equal(calls, 1);
});

test('does not cache startup/migration reads or detached work after a request ends', async t => {
  const {factory, selects} = await setup(t);
  await factory().getOptions();
  await factory().getOptions(true);
  assert.equal(selects(), 2);
  let resume;
  const gate = new Promise(resolve => { resume = resolve });
  let detached;
  await cache.run(async() => {
    await factory().getOptions();
    detached = gate.then(async() => {
      await factory().getOptions();
      await factory().getOptions();
    });
  });
  resume();
  await detached;
  assert.equal(selects(), 5);
});

test('separates databases, prefixes and scoped queries without leaving query-builder state behind', async t => {
  const first = await setup(t), second = await setup(t);
  await second.model.where({key: 'title'}).update({value: 'Second database'});
  const other = new OptionsModel('options', {...first.config, prefix: 'other_'});
  await other.execute('CREATE TABLE other_options (key TEXT PRIMARY KEY, value TEXT)');
  await other.add({key: 'title', value: 'Other prefix'});
  t.after(() => other.db().query.socket().close());
  await cache.run(async() => {
    assert.equal((await first.factory().getOptions()).title, 'Original');
    assert.equal((await second.factory().getOptions()).title, 'Second database');
    assert.equal((await other.getOptions()).title, 'Other prefix');
    const scoped = first.factory().where({key: 'site_url'});
    assert.equal((await scoped.getOptions()).title, undefined);
    assert.equal((await scoped.getOptions()).title, 'Original');
    assert.deepEqual(scoped.options, {});
    assert.equal((await first.factory().field('key').getOptions()).title, undefined);
    assert.equal((await first.factory().getOptions()).title, 'Original');
  });
});

test('bypasses dynamic SQL routers, reused and explicitly rebound connections', async t => {
  const {factory, config} = await setup(t);
  const target = await setup(t);
  await target.model.where({key: 'title'}).update({value: 'Rebound'});
  await cache.run(async() => {
    await factory().getOptions();
    const rebound = factory().db(target.model.db());
    assert.equal((await rebound.getOptions()).title, 'Rebound');
    for (const options of [{reuseDB: true}, {parser: () => ({})}]) {
      const model = new OptionsModel('options', {...config, ...options});
      let count = 0;
      model.select = async() => [{key: 'title', value: String(++count)}];
      assert.equal((await model.getOptions()).title, '1');
      assert.equal((await model.getOptions()).title, '2');
    }
  });
});

test('clears rejected reads and cannot let an old rejection evict a newer snapshot', async t => {
  const {factory} = await setup(t);
  const failure = new Error('database unavailable');
  await cache.run(async() => {
    const failed = factory();
    failed.select = async() => { throw failure };
    await assert.rejects(failed.getOptions(), error => error === failure);
    assert.equal((await factory().getOptions()).title, 'Original');
  });
  await cache.run(async() => {
    let reject;
    const old = factory();
    old.select = () => new Promise((resolve, fail) => { reject = fail });
    const pending = assert.rejects(old.getOptions(), error => error === failure);
    await factory().where({key: 'title'}).update({value: 'New'});
    const current = factory();
    let queries = 0;
    current.select = async() => { queries++; return [{key: 'title', value: 'New'}] };
    await current.getOptions();
    reject(failure);
    await pending;
    assert.equal((await current.getOptions()).title, 'New');
    assert.equal(queries, 1);
  });
});

test('invalidates every options write path and refreshes reads through another instance', async t => {
  const {factory} = await setup(t);
  const cases = [
    ['updateOptions', m => m.updateOptions('title', 'updated'), 'title', 'updated'],
    ['ensureOption', m => m.ensureOption('ensured', 'yes'), 'ensured', 'yes'],
    ['setCredentialValue insert', m => m.setCredentialValue('ai_credential_new', 'one'), 'ai_credential_new', 'one'],
    ['setCredentialValue update', m => m.setCredentialValue('ai_credential_new', 'two'), 'ai_credential_new', 'two'],
    ['deleteCredentialValue', m => m.deleteCredentialValue('ai_credential_new'), 'ai_credential_new', undefined],
    ['add', m => m.add({key: 'direct', value: 'one'}), 'direct', 'one'],
    ['addMany', m => m.addMany([{key: 'bulk', value: 'one'}]), 'bulk', 'one'],
    ['update', m => m.where({key: 'direct'}).update({value: 'two'}), 'direct', 'two'],
    ['updateMany', m => m.updateMany([{key: 'direct', value: 'three'}]), 'direct', 'three'],
    ['thenUpdate', m => m.thenUpdate({value: 'four'}, {key: 'direct'}), 'direct', 'four'],
    ['thenAdd', m => m.thenAdd({key: 'number', value: '1'}, {key: 'number'}), 'number', '1'],
    ['increment', m => m.where({key: 'number'}).increment('value'), 'number', '2'],
    ['decrement', m => m.where({key: 'number'}).decrement('value'), 'number', '1'],
    ['execute', m => m.execute('UPDATE test_options SET value=\'raw\' WHERE key=\'direct\''), 'direct', 'raw'],
    ['query', m => m.query('UPDATE test_options SET value=\'query\' WHERE key=\'direct\''), 'direct', 'query'],
    ['selectAdd', m => m.field('key,value').selectAdd({table: 'test_options',
      field: '\'copied\' AS key, value', where: {key: 'direct'}}), 'copied', 'query'],
    ['delete', m => m.where({key: 'direct'}).delete(), 'direct', undefined],
    ['adapter execute', m => m.db().execute('UPDATE test_options SET value=\'adapter\' WHERE key=\'title\''),
      'title', 'adapter'],
    ['adapter update', m => m.db().update({value: 'adapter update'},
      {table: m.tableName, where: {key: 'title'}}), 'title', 'adapter update'],
    ['adapter add', m => m.db().add({key: 'adapter', value: 'new'}, {table: m.tableName}), 'adapter', 'new'],
    ['adapter delete', m => m.db().delete({table: m.tableName, where: {key: 'adapter'}}), 'adapter', undefined]
  ];
  for (const [name, write, key, expected] of cases) await t.test(name, async() => {
    await cache.run(async() => {
      await factory().getOptions(true);
      await write(factory());
      assert.equal((await factory().getOptions(true))[key], expected);
    });
  });
});

test('reads racing a write cannot preserve or repopulate a stale cache', async t => {
  const {factory, config} = await setup(t);
  let release;
  const gate = new Promise(resolve => { release = resolve });
  class SlowAdapter extends handle {
    async update(...args) { await gate; return super.update(...args) }
  }
  await cache.run(async() => {
    let finishRead;
    const old = factory();
    old.select = () => new Promise(resolve => { finishRead = resolve });
    const pendingRead = old.getOptions();
    const writer = new OptionsModel('options', {...config, handle: SlowAdapter});
    const pendingWrite = writer.where({key: 'title'}).update({value: 'Changed'});
    assert.equal((await factory().getOptions()).title, 'Original');
    release();
    await pendingWrite;
    assert.equal((await factory().getOptions()).title, 'Changed');
    finishRead([{key: 'title', value: 'Original'}]);
    assert.equal((await pendingRead).title, 'Original');
    assert.equal((await factory().getOptions()).title, 'Changed');
  });
});

test('failed or partially successful writes clear the cached snapshot', async t => {
  const {factory, config} = await setup(t);
  class PartialAdapter extends handle {
    async update(...args) { await super.update(...args); throw new Error('after write') }
  }
  await cache.run(async() => {
    await factory().getOptions();
    await assert.rejects(new OptionsModel('options', {...config, handle: PartialAdapter})
      .where({key: 'title'}).update({value: 'Partial'}), /after write/);
    assert.equal((await factory().getOptions()).title, 'Partial');
    await assert.rejects(factory().add({key: 'title', value: 'duplicate'}), /UNIQUE/);
    assert.equal((await factory().getOptions()).title, 'Partial');
  });
});

test('transaction reads bypass snapshots and commit/rollback invalidate other model instances', async t => {
  const {factory} = await setup(t);
  await cache.run(async() => {
    await factory().getOptions();
    const tx = factory();
    await tx.startTrans();
    await tx.where({key: 'title'}).update({value: 'Uncommitted'});
    assert.equal((await tx.getOptions()).title, 'Uncommitted');
    await tx.rollback();
    assert.equal((await factory().getOptions()).title, 'Original');
    const committed = factory();
    await committed.startTrans();
    await committed.where({key: 'title'}).update({value: 'Committed'});
    await committed.commit();
    assert.equal((await factory().getOptions()).title, 'Committed');
    const callback = factory();
    await callback.transaction(async() => {
      await callback.where({key: 'title'}).update({value: 'Callback'});
      assert.equal((await callback.getOptions()).title, 'Callback');
    });
    assert.equal((await factory().getOptions()).title, 'Callback');
    const direct = factory();
    await direct.db().startTrans();
    await direct.where({key: 'title'}).update({value: 'Adapter transaction'});
    assert.equal((await direct.getOptions()).title, 'Adapter transaction');
    await direct.db().rollback();
    assert.equal((await factory().getOptions()).title, 'Callback');
    const aborted = factory();
    await assert.rejects(aborted.transaction(async() => {
      await aborted.where({key: 'title'}).update({value: 'Aborted'});
      throw new Error('rollback');
    }), /rollback/);
    assert.equal((await factory().getOptions()).title, 'Callback');
  });
});

test('real overlapping HTTP requests isolate snapshots and count one SQL per read-only request', async t => {
  const {factory, selects} = await setup(t);
  const app = new Koa();
  app.use(middleware());
  app.use(async(ctx, next) => {
    try { await next() } catch {
      // Equivalent to trace templates reading options after a controller throws.
      ctx.body = {title: (await factory().getOptions()).title};
    }
  });
  let started, resume;
  const entered = new Promise(resolve => { started = resolve });
  const gate = new Promise(resolve => { resume = resolve });
  app.use(async ctx => {
    const initial = await factory().getOptions(true);
    if (ctx.path === '/slow') { started(); await gate }
    if (ctx.path === '/write') await factory().updateOptions('title', 'HTTP update');
    if (ctx.path === '/error') throw new Error('render error');
    const results = await Promise.all(Array.from({length: 10}, () => factory().getOptions()));
    ctx.body = {initial: initial.title, current: results[0].title,
      privateSecret: initial.jwt_secret, publicSecret: results[0].jwt_secret};
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  const slow = fetch(url + '/slow').then(response => response.json());
  await entered;
  const write = await fetch(url + '/write').then(response => response.json());
  assert.equal(write.current, 'HTTP update');
  resume();
  const original = await slow;
  assert.equal(original.current, 'Original', 'the writer cannot replace another request snapshot');
  assert.equal(original.privateSecret, 'test-secret');
  assert.equal(original.publicSecret, undefined);
  const before = selects();
  const responses = await Promise.all(Array.from({length: 8}, () => fetch(url + '/read')
    .then(response => response.json())));
  assert.ok(responses.every(response => response.current === 'HTTP update'));
  assert.equal(selects() - before, 8, '88 getOptions calls across 8 requests execute 8 SELECTs');
  const errorBefore = selects();
  assert.deepEqual(await fetch(url + '/error').then(response => response.json()), {title: 'HTTP update'});
  assert.equal(selects() - errorBefore, 1);
});

test('request cache is first in production middleware, including early MCP/OAuth entry points', () => {
  Object.assign(think, {env: 'production', ROOT_PATH: process.cwd(), TMPDIR_PATH: '/tmp', THEMES_PATH: '/tmp'});
  const handlers = require('../../src/config/middleware');
  assert.equal(handlers[0].handle, middleware);
  assert.ok(handlers.findIndex(item => item.handle === require('../../src/mcp/middleware')) > 0);
  assert.ok(handlers.findIndex(item => item.handle === require('../../src/mcp/oauth-middleware').oauthMiddleware) > 0);
});
