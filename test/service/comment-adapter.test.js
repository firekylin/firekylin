const assert = require('node:assert/strict');
const test = require('node:test');
const {ModelAdapter, dbWhere} = require('../../src/service/comment-adapter');

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
