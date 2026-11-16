'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Model = require('think-model/lib/model');
const SQLite = require('think-model-sqlite');
const MySQL = require('think-model-mysql2');
const PostgreSQL = require('think-model-postgresql');

const NOW = '2026-11-11 12:00:00';
global.think = {
  Model,
  extend: (...values) => Object.assign({}, ...values),
  datetime: (value, format) => format === 'YYYY年MM月' ? '2026年11月' : value || NOW,
  isEmpty: value => value === null || value === undefined || !Object.keys(Object(value)).length,
  logger: {debug() {}},
  cache: async() => {}
};
global.firekylin = {
  POST_ARTICLE: 0, POST_PAGE: 1, POST_DRAFT: 0, POST_PUBLISH: 3, POST_PUBLIC: 1
};

const Post = require('../../src/model/post');
const Page = require('../../src/model/page');
const PostQuery = require('../../src/service/post-query');
const {passwordProtectionState} = require('../../src/service/post-protection-state');
const {migrate, definition} = require('../../src/service/migration/060-post-search-protection');

const protectedOptions = JSON.stringify({postPasswordHash: 'synthetic-hash'});
let sequence = 0;

function row(id, extra = {}) {
  return {
    id, user_id: 1, title: 'Public title', content: 'Public body', summary: 'Public summary',
    pathname: `synthetic-${id}`, create_time: `2026-11-${String(id % 9 + 1).padStart(2, '0')} 00:00:00`,
    is_public: firekylin.POST_PUBLIC, type: firekylin.POST_ARTICLE,
    status: firekylin.POST_PUBLISH, comment_num: 0, options: '{}', ...extra
  };
}

async function fixture(t, rows = [], {pageSize = 2, migrateNow = true} = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fk-search-protection-'));
  const prefix = `search_${++sequence}_`;
  const config = {handle: SQLite, path: directory, database: 'test', prefix, logConnect: false, debounce: false};
  const raw = new Model('post', config);
  t.after(async() => {
    await raw.db().query.socket().close();
    fs.rmSync(directory, {recursive: true, force: true});
  });
  await raw.execute(`CREATE TABLE ${prefix}post (
    id INTEGER PRIMARY KEY, user_id INTEGER, title TEXT, content TEXT, summary TEXT, pathname TEXT,
    create_time TEXT, update_time TEXT, is_public INTEGER, type INTEGER, status INTEGER, comment_num INTEGER, options TEXT
  )`);
  await raw.execute(`CREATE TABLE ${prefix}user (id INTEGER PRIMARY KEY, name TEXT, display_name TEXT)`);
  await raw.execute(`INSERT INTO ${prefix}user VALUES (1, 'synthetic', 'Synthetic Author')`);
  if (rows.length) await raw.addMany(rows);
  const getModel = () => {
    const post = new Post('post', config).setRelation(false);
    post.getPostsListSize = async() => pageSize;
    return post;
  };
  const context = {getModel, config: {type: 'sqlite', sqlite: {prefix}}};
  if (migrateNow) await migrate(context);
  return {getModel, context, config, raw, prefix};
}

test('protection state parses JSON keys and fails closed on malformed metadata', () => {
  for (const value of [undefined, null, '', '{}', 'null', {postPasswordHash: ''}, {postPasswordHash: null}]) {
    assert.equal(passwordProtectionState(value), 0);
  }
  for (const value of [protectedOptions, {postPasswordHash: 'hash'}, '{"postPassword\\u0048ash":"hash"}',
    '{bad-json', '[]', '"text"', 'false', ['EXP', 'options']]) {
    assert.equal(passwordProtectionState(value), 1);
  }
  assert.equal(passwordProtectionState('{"note":"postPasswordHash is documentation"}'), 0);
});

test('migration backfills legacy metadata in batches and is safe to rerun', async t => {
  const rows = Array.from({length: 105}, (_, i) => row(i + 1, {options: i % 2 ? protectedOptions : null}));
  rows.push(row(106, {options: '{malformed'}));
  const f = await fixture(t, rows);
  await migrate(f.context);
  const stored = await f.raw.order('id ASC').select();
  assert.equal(stored.length, 106);
  for (const value of stored) {
    assert.equal(value.is_password_protected, passwordProtectionState(value.options));
  }
});

test('search excludes protected title and body matches before count and pagination', async t => {
  const f = await fixture(t, [
    row(1, {title: 'SYNTHSECRET title', options: protectedOptions}),
    row(2, {content: 'SYNTHSECRET body', options: protectedOptions}),
    row(3, {title: 'SYNTHSHARED public'}),
    row(4, {title: 'SYNTHSHARED protected', options: protectedOptions}),
    row(5, {content: 'SYNTHSHARED public'}),
    row(6, {title: 'SYNTHSHARED second public'})
  ]);
  const secret = await f.getModel().getPostSearch('SYNTHSECRET', 1);
  assert.equal(secret.count, 0);
  assert.equal(secret.totalPages, 0);
  assert.deepEqual(secret.data, []);
  const first = await f.getModel().getPostSearch('SYNTHSHARED', 1);
  const second = await f.getModel().getPostSearch('SYNTHSHARED', 2);
  assert.equal(first.count, 3);
  assert.equal(first.totalPages, 2);
  assert.deepEqual(first.data.map(post => post.id), [6, 5]);
  assert.equal(second.count, 3);
  assert.deepEqual(second.data.map(post => post.id), [3]);
  const absent = await f.getModel().getPostSearch('SYNTHABSENT', 1);
  assert.equal(absent.count, secret.count);
});

test('public search retains publication, article type and date boundaries', async t => {
  const f = await fixture(t, [
    row(1, {content: 'SYNTHBOUNDARY public'}),
    row(2, {content: 'SYNTHBOUNDARY private', is_public: 0}),
    row(3, {content: 'SYNTHBOUNDARY draft', status: firekylin.POST_DRAFT}),
    row(4, {content: 'SYNTHBOUNDARY future', create_time: '2027-01-01 00:00:00'}),
    row(5, {content: 'SYNTHBOUNDARY page', type: firekylin.POST_PAGE})
  ]);
  const result = await f.getModel().getPostSearch('SYNTHBOUNDARY', 1);
  assert.equal(result.count, 1);
  assert.deepEqual(result.data.map(post => post.id), [1]);
});

test('setting, rotating and removing a password updates search visibility atomically', async t => {
  const f = await fixture(t, [row(1, {content: 'SYNTHSTATE'})]);
  const count = async() => (await f.getModel().getPostSearch('SYNTHSTATE', 1)).count;
  assert.equal(await count(), 1);
  await f.getModel().where({id: 1}).update({options: protectedOptions, is_password_protected: 0});
  assert.equal(await count(), 0);
  await f.getModel().where({id: 1}).update({comment_num: 3, is_password_protected: 0});
  assert.equal(await count(), 0);
  await f.getModel().where({id: 1}).update({options: JSON.stringify({postPasswordHash: 'rotated-hash'})});
  assert.equal(await count(), 0);
  await f.getModel().where({id: 1}).update({options: '{}', is_password_protected: 1});
  assert.equal(await count(), 1);
  await f.getModel().where({id: 1}).update({options: '{malformed'});
  assert.equal(await count(), 0);
  await f.getModel().where({id: 1}).update({options: null});
  assert.equal(await count(), 1);
});

test('derived flag covers add, batch writes and inherited page hooks', async t => {
  const f = await fixture(t);
  await f.getModel().add(row(1, {options: protectedOptions, is_password_protected: 0}));
  await f.getModel().addMany([
    row(2, {options: protectedOptions, is_password_protected: 0}),
    row(3, {is_password_protected: 1})
  ]);
  const page = new Page('page', f.config).setRelation(false);
  await page.add(row(4, {type: firekylin.POST_PAGE, options: protectedOptions, is_password_protected: 0}));
  await f.getModel().updateMany([
    {id: 2, options: '{}', is_password_protected: 1},
    {id: 3, options: protectedOptions, is_password_protected: 0}
  ]);
  const stored = await f.raw.order('id ASC').select();
  assert.deepEqual(stored.map(post => post.is_password_protected), [1, 0, 1, 1]);
});

test('home and archive retain protected placeholders while shared public search omits them', async t => {
  const f = await fixture(t, [
    row(1, {title: 'SYNTHLIST protected', options: protectedOptions}),
    row(2, {title: 'SYNTHLIST public'})
  ]);
  const list = await f.getModel().getPostList(1);
  assert.equal(list.count, 2);
  assert.equal(list.data.find(post => post.id === 1).title, '此内容被密码保护');
  const archive = await f.getModel().getPostArchive();
  assert.equal(archive['2026年11月'].find(post => post.id === 1).summary, '这篇文章受密码保护。');
  const service = new PostQuery({getModel: f.getModel, now: () => NOW});
  const results = await service.searchPublic({query: 'SYNTHLIST', limit: 1});
  assert.deepEqual(results.map(post => post.id), [2]);
  const publicList = await service.listPublic();
  assert.equal(publicList.find(post => post.id === 1).password_protected, true);
});

test('uninitialized rows are not searchable and stale backfill cannot overwrite a password update', async t => {
  const f = await fixture(t, [row(1, {content: 'SYNTHRACE'})], {migrateNow: false});
  await f.raw.query(definition(f.context.config).sql);
  assert.equal((await f.getModel().getPostSearch('SYNTHRACE', 1)).count, 0);
  const post = f.getModel();
  const adapter = post.db();
  const update = adapter.update.bind(adapter);
  let raced = false;
  adapter.update = async(data, options) => {
    if (!raced) {
      raced = true;
      await f.getModel().where({id: 1}).update({options: protectedOptions});
    }
    return update(data, options);
  };
  await migrate({...f.context, getModel: () => post});
  const stored = await f.raw.where({id: 1}).find();
  assert.equal(stored.is_password_protected, 1);
  assert.equal((await f.getModel().getPostSearch('SYNTHRACE', 1)).count, 0);
});

test('an interrupted migration leaves unknown rows hidden and resumes safely', async t => {
  const f = await fixture(t, [row(1), row(2, {options: protectedOptions})], {migrateNow: false});
  const post = f.getModel();
  const adapter = post.db();
  const update = adapter.update.bind(adapter);
  let writes = 0;
  adapter.update = async(...args) => {
    if (++writes === 2) throw new Error('synthetic interrupted migration');
    return update(...args);
  };
  await assert.rejects(migrate({...f.context, getModel: () => post}), /interrupted/);
  assert.equal((await f.raw.where({id: 2}).find()).is_password_protected, null);
  await migrate(f.context);
  assert.equal((await f.raw.where({id: 2}).find()).is_password_protected, 1);
});

for (const [type, handle] of Object.entries({sqlite: SQLite, mysql: MySQL, tidb: MySQL, postgresql: PostgreSQL})) {
  test(`${type} adapter applies the same search predicate to count and rows, and guards backfill with IS NULL`, async() => {
    const model = new Post('post', {handle, prefix: 'fk_'});
    model.getPostsListSize = async() => 2;
    const statements = [];
    model.db().query.query = async sql => {
      statements.push(sql);
      if (/COUNT\(/i.test(sql)) return [{think_count: 1}];
      return [{id: 1, title: 'Synthetic public', options: '{}'}];
    };
    const result = await model.getPostSearch('Synthetic\'word', 1);
    assert.equal(result.count, 1);
    assert.equal(statements.length, 2);
    for (const sql of statements) {
      assert.match(sql.replace(/[`"]/g, ''), /is_password_protected\s*=\s*0/);
      assert.match(sql, /title.*LIKE.*OR.*content.*LIKE/);
      assert.doesNotMatch(sql, /JSON_|::json|json_extract/i);
    }
    let backfill;
    model.db().query.execute = async sql => { backfill = sql; return 1; };
    await model.db().update({is_password_protected: 0}, {
      table: 'fk_post', where: {id: 1, is_password_protected: null}
    });
    assert.match(backfill.replace(/[`"]/g, ''), /is_password_protected\s+IS NULL/i);
    assert.equal(definition({type, [type]: {prefix: 'fk_'}}).sql,
      'ALTER TABLE fk_post ADD COLUMN is_password_protected INTEGER DEFAULT NULL');
  });
}

test('migration rejects invalid identifiers and unexpected database failures', async() => {
  assert.throws(() => definition({type: 'unsupported'}), /Unsupported/);
  assert.throws(() => definition({type: 'sqlite', sqlite: {prefix: 'bad-prefix;'}}), /prefix/);
  const failure = new Error('database unavailable');
  await assert.rejects(migrate({
    config: {type: 'sqlite', sqlite: {prefix: ''}},
    getModel: () => ({query: async() => { throw failure; }})
  }), error => error === failure);
});
