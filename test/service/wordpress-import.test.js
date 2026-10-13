const test = require('node:test');
const assert = require('node:assert/strict');

global.think = {
  Service: class {},
  datetime() { return '2026-01-01 00:00:00' }
};

const WordPressImport = require('../../src/service/import/wordpress');

function chain(result) {
  return {
    setRelation() { return this },
    field() { return this },
    where() { return this },
    select: async() => result
  };
}

test('imports WordPress comments with status, authors and reply relationships', async() => {
  const service = Object.create(WordPressImport.prototype);
  const comments = [];
  const postUpdates = [];
  service.postModelInstance = {
    ...chain([{id: 12, type: 0, pathname: 'hello'}]),
    where(where) {
      if (where.id) return {update: async data => postUpdates.push({where, data})};
      return chain([{id: 12, type: 0, pathname: 'hello'}]);
    }
  };
  service.userModelInstance = {
    where() { return {field() { return this }, async find() { return {id: 7} } } }
  };
  const commentModel = {
    async add(data) { comments.push(data); return comments.length + 100 },
    where() { return {async count() { return 1 } } }
  };
  service.model = name => {
    assert.equal(name, 'comment');
    return commentModel;
  };

  const count = await service.comment({item: [{
    'wp:post_type': ['post'],
    'wp:post_name': ['hello'],
    'wp:comment': [{
      'wp:comment_id': ['10'],
      'wp:comment_parent': ['0'],
      'wp:comment_author': ['Alice'],
      'wp:comment_author_email': ['alice@example.com'],
      'wp:comment_user_id': ['3'],
      'wp:comment_content': ['First'],
      'wp:comment_date': ['2024-03-01 10:00:00'],
      'wp:comment_approved': ['1']
    }, {
      'wp:comment_id': ['11'],
      'wp:comment_parent': ['10'],
      'wp:comment_author': ['Bob'],
      'wp:comment_content': ['Reply'],
      'wp:comment_date_gmt': ['2024-03-01 03:00:00'],
      'wp:comment_approved': ['0']
    }]
  }]});

  assert.equal(count, 2);
  assert.equal(comments[0].post_id, 12);
  assert.equal(comments[0].user_id, '7');
  assert.equal(comments[0].status, 'approved');
  assert.equal(comments[0].pid, null);
  assert.equal(comments[1].status, 'waiting');
  assert.equal(comments[1].pid, '101');
  assert.equal(comments[1].rid, '101');
  assert.deepEqual(postUpdates, [{where: {id: 12}, data: {comment_num: 1}}]);
});

test('imports a child after its parent even when WXR order is reversed', async() => {
  const service = Object.create(WordPressImport.prototype);
  const inserted = [];
  service.postModelInstance = {
    ...chain([{id: 8, type: 1, pathname: 'about'}]),
    where(where) {
      if (where.id) return {async update() {}};
      return chain([{id: 8, type: 1, pathname: 'about'}]);
    }
  };
  service.userModelInstance = {where() { throw new Error('anonymous comments should not query users') }};
  service.model = () => ({
    async add(data) { inserted.push(data); return inserted.length },
    where() { return {async count() { return 2 } } }
  });

  const makeComment = (id, parent, content) => ({
    'wp:comment_id': [id],
    'wp:comment_parent': [parent],
    'wp:comment_content': [content],
    'wp:comment_approved': ['spam']
  });
  await service.comment({item: [{
    'wp:post_type': ['page'],
    'wp:post_name': ['about'],
    'wp:comment': [makeComment('2', '1', 'child'), makeComment('1', '0', 'root')]
  }]});

  assert.deepEqual(inserted.map(item => item.comment), ['root', 'child']);
  assert.equal(inserted[1].pid, '1');
  assert.equal(inserted[1].rid, '1');
  assert.equal(inserted[0].url, '/page/about.html');
  assert.equal(inserted[0].status, 'spam');
});
