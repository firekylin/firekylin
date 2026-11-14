const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function adapter(database, allowSqlite = false) {
  const loaded = [];
  const context = {
    module: {exports: {}},
    process: {env: {}},
    think: {env: 'production'},
    require(name) {
      loaded.push(name);
      if (name === '../../../lib/project-context') {
        return {getContext: () => ({legacy: false, config: {database}})};
      }
      if (name === 'think-model-sqlite' && !allowSqlite) {
        throw new Error('Native SQLite is unavailable');
      }
      return name;
    }
  };
  const filename = path.join(__dirname, '../../src/config/adapter/model.js');
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, {filename});
  return {value: context.module.exports, loaded};
}

test('PostgreSQL and MySQL boot without loading the SQLite native driver', () => {
  for (const type of ['postgresql', 'mysql', 'tidb']) {
    const {value, loaded} = adapter({type});
    assert.equal(value.type, type);
    assert.ok(!loaded.includes('think-model-sqlite'));
  }
});

test('SQLite still loads its driver when selected', () => {
  const {value, loaded} = adapter({type: 'sqlite'}, true);
  assert.equal(value.sqlite.handle, 'think-model-sqlite');
  assert.ok(loaded.includes('think-model-sqlite'));
});

test('PostgreSQL uses a real pg pool limit and accepts an explicit maximum', () => {
  assert.equal(adapter({type: 'postgresql'}).value.postgresql.max, 1);
  assert.equal(adapter({type: 'postgresql', max: 4}).value.postgresql.max, 4);
});

test('loading vision helpers does not load sharp until image processing is requested', () => {
  const filename = path.join(__dirname, '../../src/ai/vision.js');
  const loaded = [];
  const context = {
    module: {exports: {}}, Buffer,
    require(name) {
      loaded.push(name);
      throw new Error('Native libraries unavailable');
    }
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, {filename});
  assert.equal(typeof context.module.exports.normalizeImage, 'function');
  assert.deepEqual(loaded, []);
});
