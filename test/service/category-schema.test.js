'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

test('category schema adds the description column and records its version', async() => {
  const queries = [];
  const updates = [];
  global.think = {
    Service: class {},
    config: () => ({type: 'sqlite', sqlite: {prefix: 'fk_'}})
  };
  const Service = require('../../src/service/category-schema');
  const service = Object.create(Service.prototype);
  service.model = name => name === 'options' ? {
    getOptions: async() => ({site_url: 'https://example.com'}),
    updateOptions: async(...args) => updates.push(args)
  } : {
    query: async sql => queries.push(sql)
  };

  assert.equal(await service.migrate({skipIfUninstalled: true}), true);
  assert.deepEqual(queries, ['ALTER TABLE fk_cate ADD COLUMN description TEXT']);
  assert.deepEqual(updates, [['category_schema_version', '1']]);
});
