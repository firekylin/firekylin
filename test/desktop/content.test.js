'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Model = require('think-model/lib/model');
const SQLite = require('think-model-sqlite');

global.think = {Model, datetime: () => '2026-11-14 12:00:00', isEmpty: value => !value || !Object.keys(value).length,
  cache: async() => null, logger: {debug() {}}, md5: value => require('node:crypto').createHash('md5')
    .update(value)
    .digest('hex')};
global.firekylin = {POST_ARTICLE: 0, POST_PAGE: 1, POST_ATTACHMENT: 2, POST_DRAFT: 0, POST_AUDITING: 1,
  POST_REJECT: 2, POST_PUBLISH: 3, USER_ADMIN: 1, USER_EDITOR: 2, USER_CONTRIBUTOR: 3, USER_AVAILABLE: 1};
const Post = require('../../src/model/post');
const {Content} = require('../../src/desktop/content');
const {Operations} = require('../../src/desktop/operations');
const {allowed} = require('../../src/desktop/auth');
const {migrate} = require('../../src/service/migration/060-desktop');

const siteOptions = {site_url: 'https://blog.example', auto_summary: '100'};
class Options extends Model {
  async getOptions() { return siteOptions; }
}
async function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'desktop-content-'));
  const config = {handle: SQLite, path: directory, database: 'fixture', prefix: 'fk_', debounce: false};
  const getModel = name => {
    const models = {post: Post, options: Options};
    const model = new (models[name] || Model)(name, config);
    model.models = models;
    return model;
  };
  await getModel('post').execute(`CREATE TABLE fk_post (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT,
    type INTEGER, user_id INTEGER, status INTEGER, pathname TEXT UNIQUE, markdown_content TEXT, content TEXT,
    summary TEXT, options TEXT, create_time TEXT, update_time TEXT, is_public INTEGER, allow_comment INTEGER)`);
  for (const name of ['cate', 'tag']) {
    await getModel(name).execute(`CREATE TABLE fk_${name} (id INTEGER PRIMARY KEY, name TEXT)`);
    await getModel(name).execute(`CREATE TABLE fk_post_${name} (post_id INTEGER, ${name}_id INTEGER)`);
    await getModel(name).add({id: 1, name: 'Existing'});
  }
  await getModel('user').execute('CREATE TABLE fk_user (id INTEGER PRIMARY KEY, name TEXT, display_name TEXT)');
  await migrate({getModel, config: {type: 'sqlite', sqlite: {prefix: 'fk_'}}});
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const service = user => new Content({getModel, principal: user, siteOptions});
  return {getModel, admin: service({id: 1, type: 1}), editor: service({id: 2, type: 2})};
}

test('desktop scopes do not accept MCP grants or disabled/comment-only accounts', () => {
  assert.equal(allowed(['desktop:content'], {id: 1, type: 1, status: 1}), true);
  assert.equal(allowed(['desktop:content'], {id: 2, type: 3, status: 1}), true);
  assert.equal(allowed(['posts:read'], {id: 1, type: 1, status: 1}), false);
  assert.equal(allowed(['desktop:content'], {id: 1, type: 4, status: 1}), false);
  assert.equal(allowed(['desktop:content'], {id: 1, type: 1, status: 2}), false);
});

test('native content writes preserve model lifecycle, revisions, type and ownership in SQLite', async t => {
  const {admin, editor, getModel} = await fixture(t);
  const created = await admin.write('articles', null, {title: 'Hello', body: '**World**',
    pathname: 'hello', categories: [1], cover: 'https://blog.example/image.png'});
  assert.equal(created.revision, 1);
  assert.equal(created.status, 0);
  assert.equal(created.cover, 'https://blog.example/image.png');
  assert.equal(created.categories.length, 1);
  assert.match((await getModel('post').where({id: created.id}).find()).content, /<strong>World<\/strong>/);
  await assert.rejects(editor.get('articles', created.id), /CONTENT_NOT_FOUND/);
  await assert.rejects(admin.get('pages', created.id), /CONTENT_NOT_FOUND/);
  const updated = await admin.write('articles', created.id,
    {revision: created.revision, body: 'Updated', categories: []});
  assert.ok(updated.revision > created.revision);
  assert.equal(updated.categories.length, 0);
  await assert.rejects(admin.write('articles', created.id,
    {revision: created.revision, body: 'Lost update'}), /REVISION_CONFLICT/);
  assert.equal((await admin.get('articles', created.id)).markdown_content, 'Updated');
  const before = updated.revision;
  await getModel('post').savePost({id: created.id, title: 'Web edit'});
  await assert.rejects(admin.write('articles', created.id, {revision: before, body: 'Stale'}), /REVISION_CONFLICT/);
  const owned = await editor.write('pages', null, {title: 'Page', pathname: 'page', body: 'Body'});
  await assert.rejects(editor.write('pages', owned.id, {revision: owned.revision, action: 'publish'}), /PUBLICATION_FORBIDDEN/);
  const submitted = await editor.write('pages', owned.id, {revision: owned.revision, action: 'submit'});
  assert.equal(submitted.status, 1);
  assert.equal((await admin.list('pages', {})).items.length, 1);
});

test('durable operation keys replay results and refuse duplicates after an uncertain outcome', async t => {
  const {getModel} = await fixture(t);
  const operations = new Operations(getModel);
  let count = 0;
  const action = async() => ({id: ++count});
  const key = 'test-operation-key-0001';
  assert.deepEqual(await operations.run(1, key, {body: 'one'}, action), {id: 1});
  assert.deepEqual(await operations.run(1, key, {body: 'one'}, action), {id: 1});
  assert.equal(count, 1);
  const ordered = 'test-operation-order-0003';
  await operations.run(1, ordered, {a: 1, b: {x: 2, y: 3}}, action);
  await operations.run(1, ordered, {b: {y: 3, x: 2}, a: 1}, action);
  assert.equal(count, 2);
  await assert.rejects(operations.run(1, key, {body: 'two'}, action), /IDEMPOTENCY_KEY_REUSED/);
  const pending = 'test-operation-key-0002';
  await assert.rejects(operations.run(1, pending, {}, async() => { throw new Error('Connection lost'); }), /Connection lost/);
  await assert.rejects(operations.run(1, pending, {}, action), /OUTCOME_UNKNOWN/);
  assert.equal((await operations.lookup(1, pending)).state, 'pending');
  await assert.rejects(operations.lookup(2, pending), /OPERATION_NOT_FOUND/);
});


test('desktop migration is repeatable and preserves legacy duplicate pathnames on failure', async t => {
  const {getModel} = await fixture(t);
  const config = {type: 'sqlite', sqlite: {prefix: 'fk_'}};
  await migrate({getModel, config});
  await getModel('post').query('DROP TABLE fk_post');
  await getModel('post').query('CREATE TABLE fk_post (id INTEGER PRIMARY KEY, pathname TEXT)');
  await getModel('post').add({id: 1, pathname: 'duplicate'});
  await getModel('post').add({id: 2, pathname: 'duplicate'});
  await assert.rejects(migrate({getModel, config}), /resolve duplicates/);
  assert.equal(await getModel('post').count(), 2);
});
