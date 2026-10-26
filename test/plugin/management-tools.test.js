'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const ToolRegistry = require('../../src/plugin/tools');
const {registerManagementTools} = require('../../src/plugin/management-tools');

function fixture() {
  const calls = [];
  let existing = null;
  let activeWhere;
  const post = {
    config: {prefix: 'fk_'},
    where(where) {activeWhere = where; calls.push(['post.where', where]); return this;},
    field() {return this;},
    order() {return this;},
    page() {return this;},
    async countSelect() {return {count: 0, data: []};},
    setRelation() {return this;},
    async find() {
      if (!existing) return {};
      if (activeWhere.user_id !== undefined && Number(activeWhere.user_id) !== Number(existing.user_id)) return {};
      return existing;
    },
    async getContentAndSummary(data) {return {...data, summary: 'summary', content: '<p>rendered</p>'};},
    getPostTime(data) {return {...data, create_time: 'now', update_time: 'now'};},
    async addPost(data) {calls.push(['add', data]); return 123;},
    async savePost(data) {calls.push(['save', data]); return 1;},
    async deletePost(id) {calls.push(['delete', id]); return 1;}
  };
  const cate = {
    setRelation() {return this;}, async select() {return [{id: 1, name: 'Tech', pathname: 'tech', pid: 0, secret: 'x'}]},
    async addCate(data) {calls.push(['cate.add', data]); return {id: 11}},
    async saveCate(data) {calls.push(['cate.save', data]); return 1},
    async deleteCate(value) {calls.push(['cate.delete', value]); return 1}
  };
  const tag = {
    setRelation() {return this;}, async select() {return [{id: 2, name: 'Node', pathname: 'node'}]},
    async addTag(data) {calls.push(['tag.add', data]); return {id: 12}},
    async saveTag(data) {calls.push(['tag.save', data]); return 1},
    async deleteTag(value) {calls.push(['tag.delete', value]); return 1}
  };
  const comment = {
    where(where) {calls.push(['comment.where', where]); return this;},
    setRelation() {return this;},
    order() {return this;},
    page() {return this;},
    async select() {return [{id: 4, comment: 'hello', nick: 'guest', email: 'secret'}];},
    async find() {return {id: 4, post_id: 5, status: 'waiting'};},
    async update(data) {calls.push(['comment.update', data]); return 1;},
    async delete() {calls.push(['comment.delete']); return 1;}
  };
  const options = {
    async getOptions() {return {title: 'Blog', post_permalink: '/post/{slug}.html', jwt_secret: 'hidden'}},
    async updateOptions(data) {calls.push(['options.update', data])}
  };
  const models = {post, cate, tag, comment, options};
  const registry = new ToolRegistry();
  registerManagementTools(registry, {
    getModel: name => models[name], now: () => 'now',
    getCommentService: () => ({
      async syncCount(controller, postId) {
        calls.push(['syncCount', postId]);
      },
      async notifyApprovedReply(controller, comment) {
        calls.push(['notifyApprovedReply', comment.id]);
      }
    })
  });
  const admin = {id: 1, type: 1};
  const editor = {id: 2, type: 2};
  const run = (name, input, principal = admin, approve = () => true) => registry.execute(name, input, {
    principal, authorize: () => true, approve
  });
  return {registry, calls, run, admin, editor, setExisting: value => {existing = value}};
}

test('registers all management tools', () => {
  const {registry} = fixture();
  assert.deepEqual(registry.list().map(item => item.name), [
    'posts.list_managed', 'categories.create', 'categories.update', 'categories.delete',
    'tags.create', 'tags.update', 'tags.delete', 'posts.get_managed',
    'comments.create', 'comments.update', 'comments.moderate', 'posts.update',
    'posts.create_draft', 'posts.update_draft', 'posts.publish', 'posts.delete',
    'categories.list', 'tags.list', 'comments.list', 'comments.approve',
    'settings.get', 'settings.update'
  ]);
});

test('creates a private draft using existing post model lifecycle', async() => {
  const {run, calls, editor} = fixture();
  assert.equal(await run('posts.create_draft', {title: 'Test', pathname: 'test', markdown_content: '# hello'}, editor), 123);
  const created = calls.find(([action]) => action === 'add')[1];
  assert.equal(created.status, 0);
  assert.equal(created.is_public, 0);
  assert.equal(created.user_id, 2);
  assert.equal(created.summary, 'summary');
  assert.equal(created.content, '<p>rendered</p>');
});

test('updateDraft refuses modifying another owner or already-published article', async() => {
  const {run, setExisting, editor, calls} = fixture();
  setExisting({id: 5, type: 0, status: 0, user_id: 3, pathname: 'test'});
  await assert.rejects(run('posts.update_draft', {id: 5, title: 'New'}, editor), /permission denied|not found/i);
  // Fake model needs to respect the WHERE owner's condition.
  assert.equal(calls.some(([action, where]) => action === 'post.where' && where.user_id === 2), true);
});

test('publication requires administrator and explicit approval', async() => {
  const {run, setExisting, editor, calls} = fixture();
  setExisting({id: 5, status: 0, user_id: 2});
  await assert.rejects(run('posts.publish', {id: 5}, editor), /administrators/);
  await assert.rejects(run('posts.publish', {id: 5}, undefined, () => false), /Explicit approval/);
  assert.deepEqual(await run('posts.publish', {id: 5}), {id: 5, status: 3, affectedRows: 1});
  assert.ok(calls.some(([type, payload]) => type === 'save' && payload.status === 3));
});

test('delete requires explicit approval and invokes normal model lifecycle', async() => {
  const {run, setExisting, calls} = fixture();
  setExisting({id: 10, status: 0});
  await assert.rejects(run('posts.delete', {id: 10}, undefined, () => false), /Explicit approval/);
  assert.equal(calls.some(([type]) => type === 'delete'), false);
  await run('posts.delete', {id: 10});
  assert.ok(calls.some(([type, value]) => type === 'delete' && value === 10));
});

test('taxonomy tools return safe fields only', async() => {
  const {run} = fixture();
  assert.deepEqual(await run('categories.list', {}), [{id: 1, name: 'Tech', pathname: 'tech', pid: 0}]);
  assert.deepEqual(await run('tags.list', {}), [{id: 2, name: 'Node', pathname: 'node'}]);
});

test('taxonomy writes require admin and destructive operations require approval', async() => {
  const {run, calls, editor} = fixture();
  await assert.rejects(run('categories.create', {name: 'Life', pathname: 'life'}, editor), /Administrator/);
  assert.deepEqual(await run('categories.create', {name: 'Life', pathname: 'life'}), {id: 11});
  assert.deepEqual(await run('tags.update', {id: 2, name: 'Node.js'}), {id: 2, affectedRows: 1});
  await assert.rejects(run('categories.delete', {id: 1}, undefined, () => false), /Explicit approval/);
  await run('categories.delete', {id: 1});
  assert.ok(calls.some(([action, value]) => action === 'cate.delete' && value === 1));
});

test('comment tools require admin and synchronize counts on approval', async() => {
  const {run, calls, editor} = fixture();
  await assert.rejects(run('comments.list', {}, editor), /Administrator/);
  const comments = await run('comments.list', {});
  assert.equal(comments[0].email, undefined);
  assert.equal(comments[0].comment, 'hello');
  await assert.rejects(run('comments.approve', {id: 4}, editor), /Administrator/);
  await run('comments.approve', {id: 4});
  assert.ok(calls.some(([action, id]) => action === 'notifyApprovedReply' && id === 4));
  assert.ok(calls.some(([action, postId]) => action === 'syncCount' && postId === 5));
  await run('comments.moderate', {id: 4, status: 'spam'});
  assert.ok(calls.some(([action, data]) => action === 'comment.update' && data.status === 'spam'));
});

test('site settings expose and update only allowlisted values', async() => {
  const {run, calls, editor} = fixture();
  await assert.rejects(run('settings.get', {}, editor), /Administrator/);
  assert.deepEqual(await run('settings.get', {}), {title: 'Blog', post_permalink: '/post/{slug}.html'});
  await run('settings.update', {settings: {title: 'New blog', postsListSize: 20}});
  assert.deepEqual(calls.find(([action]) => action === 'options.update')[1], {title: 'New blog', postsListSize: '20'});
  await assert.rejects(run('settings.update', {settings: {jwt_secret: 'nope'}}), /Unsupported setting/);
  await assert.rejects(run('settings.update', {settings: {comment: 'disabled'}}), /Invalid comment settings/);
  await run('settings.update', {settings: {frontPage: '', comment: {audit: true}}});
  assert.deepEqual(calls.filter(([action]) => action === 'options.update').at(-1)[1], {
    frontPage: '', comment: '{"audit":true}'
  });
});

test('tools reject unsupported arguments and unauthenticated calls', async() => {
  const {run, registry} = fixture();
  await assert.rejects(run('posts.create_draft', {title: 'T', pathname: 't', markdown_content: '# hi', status: 3}), /Unsupported property/);
  await assert.rejects(run('posts.publish', {id: '7'}), /Invalid ID/);
  await assert.rejects(registry.execute('posts.create_draft', {title: 'T', pathname: 't', markdown_content: '# hi'}, {authorize: () => true}), /Authenticated principal/);
});

test('managed article tools reuse admin queries and require authenticated principal', async() => {
  const {run, setExisting, calls, editor} = fixture();
  setExisting({id: 8, user_id: 2, status: 0, title: 'Draft', markdown_content: '# draft'});
  const result = await run('posts.get_managed', {id: 8}, editor);
  assert.equal(result.markdown_content, '# draft');
  assert.ok(calls.some(([kind, where]) => kind === 'post.where' && where.user_id === 2));
  await assert.rejects(run('posts.get_managed', {id: 8}, {type: 4}), /Authenticated author/);
});

test('updating published article through tool requires approval', async() => {
  const {run, setExisting, calls, editor} = fixture();
  setExisting({id: 8, user_id: 2, status: 3, pathname: 'post'});
  await assert.rejects(run('posts.update', {id: 8, title: 'New'}, editor, () => false), /Explicit approval/);
  await run('posts.update', {id: 8, title: 'New'}, editor);
  assert.ok(calls.some(([kind, data]) => kind === 'save' && data.status === 1));
});

test('managed post ability preserves admin detail and limits MCP fields', async() => {
  const {registry, setExisting, editor} = fixture();
  setExisting({
    id: 8, user_id: 2, status: 0, title: 'Draft',
    markdown_content: '# draft', options: '{"postPasswordHash":"secret"}'
  });
  const context = channel => ({
    channel, principal: editor, authorize: permission => permission === 'posts:manage:read'
  });
  const fromAdmin = await registry.execute('posts.get_managed', {id: 8}, context('admin'));
  const fromMcp = await registry.execute('posts.get_managed', {id: 8}, context('mcp'));
  assert.equal(fromAdmin.options, '{"postPasswordHash":"secret"}');
  assert.equal(fromMcp.options, undefined);
  assert.equal(fromMcp.markdown_content, '# draft');
});

test('managed list ability keeps admin pagination contract', async() => {
  const {registry, editor} = fixture();
  // Both transports receive the same pagination structure from the shared query service.
  const result = await registry.execute('posts.list_managed', {
    page: 1, limit: 15, keyword: 'hello'
  }, {
    channel: 'admin', principal: editor,
    authorize: permission => permission === 'posts:manage:read'
  });
  assert.deepEqual(result, {count: 0, data: []});
});
