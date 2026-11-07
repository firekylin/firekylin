'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

test('category schema adds the description column and records its version', async() => {
  const queries = [];
  const updates = [];
  const {migrate} = require('../../src/service/migration/020-category');
  const config = {type: 'sqlite', sqlite: {prefix: 'fk_'}};
  const getModel = name => name === 'options' ? {
    getOptions: async() => ({site_url: 'https://example.com'}),
    updateOptions: async(...args) => updates.push(args)
  } : {
    query: async sql => queries.push(sql)
  };

  assert.equal(await migrate({getModel, config}), true);
  assert.deepEqual(queries, ['ALTER TABLE fk_cate ADD COLUMN description TEXT']);
  assert.deepEqual(updates, [['category_schema_version', '1']]);
});
