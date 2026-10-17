'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const PostCommandService = require('../../src/service/post-command');
const CommentModerationService = require('../../src/service/comment-moderation');

function fixture() {
  const operations = [];
  let current = {};
  const model = {
    where(where) { operations.push(['where', where]); return this; },
    setRelation() { return this; },
    async find() { return current; },
    getPostTime(data) { data.update_time = 'now'; return data; },
    async getContentAndSummary(data) { operations.push(['render', data.markdown_content]); return {...data, summary: 'summary', content: 'html'}; },
    async addPost(data) { operations.push(['add', data]); return 12; },
    async savePost(data) { operations.push(['save', data]); return 1; },
    async deletePost(id) { operations.push(['delete', id]); return 1; }
  };
  const svc = new PostCommandService({getModel: () => model, now: () => 'now'});
  return {svc, operations, setPost: value => {current = value}};
}

test('admin and tool create flow use identical post creation lifecycle', async() => {
  const {svc, operations} = fixture();
  const result = await svc.create({title: 'Hello', pathname: 'hello', markdown_content: '# Hi', status: 3}, {id: 2, type: 2});
  assert.equal(result, 12);
  const added = operations.find(([name]) => name === 'add')[1];
  assert.equal(added.status, 1);
  assert.equal(added.user_id, 2);
  assert.equal(added.summary, 'summary');
  assert.equal(added.content, 'html');
});

test('tool draft creation and admin creation share create implementation', async() => {
  const {svc, operations} = fixture();
  await svc.createDraft({title: 'Draft', pathname: 'draft', markdown_content: 'Hello'}, {id: 2, type: 2});
  const saved = operations.find(([name]) => name === 'add')[1];
  assert.equal(saved.status, 0);
  assert.equal(saved.is_public, 0);
});

test('update rejects unauthorized owner and preserves model save hooks', async() => {
  const {svc, operations, setPost} = fixture();
  setPost({id: 7, user_id: 3, status: 0, pathname: 'existing'});
  // The real database applies the user_id filter. Test the filter passed to the model.
  await svc.update({id: 7, markdown_content: '# updated'}, {id: 3, type: 2});
  assert.ok(operations.some(([type, value]) => type === 'where' && value.user_id === 3));
  assert.ok(operations.some(([type, value]) => type === 'save' && value.summary === 'summary'));
});

test('update checks ownership before preparing protected options', async() => {
  const {svc, operations, setPost} = fixture();
  setPost({id: 7, user_id: 3, status: 0, pathname: 'existing', options: '{}'});
  let prepared = false;
  await svc.update({id: 7, post_password: 'secret'}, {id: 3, type: 2}, {
    prepare(data, post) {
      prepared = true;
      assert.ok(operations.some(([type, value]) => type === 'where' && value.user_id === 3));
      assert.equal(post.id, 7);
      return {...data, options: '{"postPasswordHash":"hash"}'};
    }
  });
  assert.equal(prepared, true);
  assert.ok(operations.some(([type, value]) => type === 'save' && value.options.includes('postPasswordHash')));
});

test('bulk edit de-duplicates ids and updates post metadata', async() => {
  const {svc, operations, setPost} = fixture();
  setPost({id: 7, user_id: 3, status: 0, pathname: 'existing'});
  const result = await svc.bulk({
    ids: [7, 8, 8], operation: 'edit', cate: [{id: 2}], tag: ['news'],
    is_public: 0, allow_comment: 0, post_password: 'secret'
  }, {id: 3, type: 2}, {
    getTagModel: () => ({setRelation() {return this}, where() {return this}, async thenAdd() {return {id: 5}}}),
    prepare: data => ({...data, options: '{"postPasswordHash":"hash"}'})
  });
  const saves = operations.filter(([name]) => name === 'save');
  assert.equal(result.affectedRows, 2);
  assert.equal(saves.length, 2);
  assert.deepEqual(saves[0][1].cate, [{id: 2}]);
  assert.deepEqual(saves[0][1].tag, [{tag_id: 5, name: 'news'}]);
  assert.equal(saves[0][1].is_public, 0);
  assert.equal(saves[0][1].allow_comment, 0);
  assert.equal(saves[0][1].options, '{"postPasswordHash":"hash"}');
});

test('bulk author changes require an administrator', async() => {
  const {svc, setPost} = fixture();
  setPost({id: 7, user_id: 3, status: 0, pathname: 'existing'});
  await assert.rejects(
    svc.bulk({ids: [7], operation: 'edit', user_id: 4}, {id: 3, type: 2}),
    /Only administrators/
  );
});

test('bulk permanent delete validates the selection before deleting', async() => {
  const {svc, operations, setPost} = fixture();
  setPost({id: 7, user_id: 3, status: 4, pathname: 'existing'});
  const result = await svc.bulk({ids: [7, 8], operation: 'forceDelete'}, {id: 3, type: 2});
  assert.equal(result.affectedRows, 2);
  assert.deepEqual(operations.filter(([name]) => name === 'delete').map(([, id]) => id), [7, 8]);
});

test('shared moderator requires administrator and updates comment count', async() => {
  const operations = [];
  const getModel = () => ({
    where(where) {operations.push(['where', where]); return this;},
    setRelation() {return this;},
    async find() {return {id: 7, post_id: 6, status: 'waiting'};},
    async update(data) {operations.push(['update', data]); return 1;}
  });
  const service = new CommentModerationService({
    getModel, now: () => 'now',
    syncCount: async postId => operations.push(['sync', postId])
  });
  await assert.rejects(service.moderate({id: 7, operation: 'approved'}, {type: 2}), /Administrator/);
  assert.deepEqual(await service.moderate({id: 7, operation: 'approved', onlyWaiting: true}, {type: 1}),
    {id: 7, status: 'approved'});
  assert.ok(operations.some(([action, value]) => action === 'sync' && value === 6));
});


test('shared moderation preserves commenter own edit/delete without granting approval', async() => {
  let existing = {id: 7, user_id: '4', post_id: 9};
  const changes = [];
  const service = new CommentModerationService({
    getModel: () => ({where() {return this}, setRelation() {return this},
      async find() {return existing}, async update(value) {changes.push(value)}, async delete() {changes.push('delete')}}),
    now: () => 'now', syncCount: async() => {}
  });
  await service.moderate({id: 7, operation: 'edit', comment: 'Edited', allowCommenter: true}, {id: 4, type: 4});
  assert.equal(changes[0].comment, 'Edited');
  await assert.rejects(service.moderate({id: 7, operation: 'approved', allowCommenter: true}, {id: 4, type: 4}), /USER_NO_PERMISSION/);
  existing = {...existing, user_id: '5'};
  await assert.rejects(service.moderate({id: 7, operation: 'delete', allowCommenter: true}, {id: 4, type: 4}), /USER_NO_PERMISSION/);
  await assert.rejects(service.moderate({id: 7, operation: 'edit'}, {id: 4, type: 4}), /Administrator/);
});
