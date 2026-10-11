const assert = require('node:assert/strict');
const test = require('node:test');
const {dbWhere} = require('../../src/service/waline-adapter');

test('Waline undefined query values select NULL database fields', () => {
  assert.deepEqual(dbWhere({rid: undefined, objectId: '1'}), {rid: null, id: '1'});
});
