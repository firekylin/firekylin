const assert = require('node:assert/strict');
const test = require('node:test');
const {dbWhere} = require('../../src/service/comment-adapter');

test('comment adapter maps undefined query values to NULL database fields', () => {
  assert.deepEqual(dbWhere({rid: undefined, objectId: '1'}), {rid: null, id: '1'});
});
