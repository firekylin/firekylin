const assert = require('node:assert/strict');
const test = require('node:test');
const {ModelAdapter, CommentAdapter, UserAdapter, dbWhere} = require('../../src/service/comment-adapter');

test('comment adapter maps undefined query values to NULL database fields', () => {
  assert.deepEqual(dbWhere({rid: undefined, objectId: '1'}), {rid: null, id: '1'});
});

test('comment adapter supplies all required timestamps when inserting', async() => {
  const originalThink = global.think;
  global.think = {datetime: () => '2026-10-12 04:22:35'};
  let inserted;
  const adapter = new ModelAdapter({
    async add(data) {
      inserted = data;
      return 5;
    }
  }, {hasInsertedAt: true});

  try {
    const result = await adapter.add({comment: '你好世界', url: '/post/doumark.html', insertedAt: new Date()});
    assert.equal(inserted.inserted_at, '2026-10-12 04:22:35');
    assert.equal(inserted.created_at, '2026-10-12 04:22:35');
    assert.equal(inserted.updated_at, '2026-10-12 04:22:35');
    assert.equal(result.insertedAt, '2026-10-12 04:22:35');
  } finally {
    global.think = originalThink;
  }
});

test('comment adapter stores and queries comments by post id', async() => {
  const originalThink = global.think;
  global.think = {datetime: () => '2026-10-12 04:22:35'};
  let inserted;
  let selectedWhere;
  const query = {
    order() { return this },
    limit() { return this },
    async select() { return [] }
  };
  const model = {
    async add(data) { inserted = data; return 1 },
    where(value) { selectedWhere = value; return query }
  };
  const adapter = new CommentAdapter(model, async url => url.includes('hello') ? 42 : null);
  try {
    await adapter.add({comment: 'Hi', url: '/post/hello.html'});
    assert.equal(inserted.post_id, 42);
    assert.equal(inserted.url, '/post/hello.html');
    await adapter.select({url: '/post/hello.html'});
    assert.deepEqual(selectedWhere, {post_id: 42});
  } finally {
    global.think = originalThink;
  }
});

test('user adapter preserves the active-user predicate and password projection', async() => {
  let selectedWhere;
  let selectedFields;
  const query = {
    field(value) { selectedFields = value; return this },
    limit() { return this },
    order() { return this },
    async select() {
      return [{
        id: 7, email: 'user@example.com', name: 'user', display_name: 'User', type: 4, status: 1, password: 'hash'
      }];
    }
  };
  const adapter = new UserAdapter({
    where(value) { selectedWhere = value; return query }
  });

  const sessionUsers = await adapter.select(
    {objectId: '7', type: ['!=', 'banned']},
    {field: ['id', 'email', 'display_name', 'type']}
  );
  assert.deepEqual(selectedWhere, {id: '7', status: 1});
  assert.doesNotMatch(selectedFields, /password/);
  assert.equal(sessionUsers[0].password, undefined);

  const loginUsers = await adapter.select({email: 'user@example.com'}, {field: ['id', 'email', 'type', 'password']});
  assert.match(selectedFields, /password/);
  assert.equal(loginUsers[0].password, 'hash');
});

test('user adapter handles PostgreSQL string counts when choosing a unique name', async() => {
  const originalThink = global.think;
  global.think = {datetime: () => '2026-10-12 12:00:00'};
  const checkedNames = [];
  let inserted;
  const model = {
    where(value) {
      this.currentWhere = value;
      if (value.name) checkedNames.push(value.name);
      return this;
    },
    async count() { return this.currentWhere.name === 'social-user' ? '1' : '0' },
    async add(data) { inserted = data; return 9 },
    async find() { return {...inserted, id: 9} }
  };
  try {
    const adapter = new UserAdapter(model);
    const user = await adapter.add({email: 'social-user@example.com', display_name: 'Social User'});
    assert.deepEqual(checkedNames, ['social-user', 'social-user-1']);
    assert.equal(inserted.name, 'social-user-1');
    assert.equal(user.objectId, '9');
  } finally {
    global.think = originalThink;
  }
});
