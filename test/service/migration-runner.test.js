'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {migrate} = require('../../src/service/migration-runner');
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fk-migrations-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const current = {site_url: 'https://example.com'};
  const calls = [];
  const runtime = {model: name => name === 'options' ? {
    getOptions: async() => current,
    updateOptions: async(key, value) => {current[key] = value}
  } : {query: async sql => calls.push(sql)}, config: () => ({}), logger: {error: () => calls.push('error')}};
  const add = (name, source) => fs.writeFileSync(path.join(directory, name + '.js'), source);
  return {directory, runtime, current, calls, add};
}
test('discovers migrations in order, records successes and skips completed versions', async t => {
  const f = fixture(t);
  f.add('020-second', "module.exports = {version: 1, migrate: async({model}) => model.query('second')}");
  f.add('010-first', "module.exports = {version: 1, migrate: async({model}) => model.query('first')}");
  await migrate(f); await migrate(f);
  assert.deepEqual(f.calls, ['first', 'second']);
  f.add('030-new', "module.exports = {version: 1, migrate: async({model}) => model.query('new')}");
  await migrate(f);
  assert.deepEqual(f.calls, ['first', 'second', 'new']);
});
test('does not mark failures; optional failures allow later migrations and retry', async t => {
  const f = fixture(t);
  f.add('010-optional', "module.exports = {version: 1, optional: true, migrate: async() => {throw Error('fail')}}");
  f.add('020-required', "module.exports = {version: 1, migrate: async() => {throw Error('required')}}");
  await assert.rejects(migrate(f), /required/);
  assert.equal(f.current['migration_010-optional'], undefined);
  assert.equal(f.current['migration_020-required'], undefined);
  assert.deepEqual(f.calls, ['error']);
});
test('does not migrate uninstalled sites and propagates database outages', async t => {
  const f = fixture(t);
  f.current.site_url = '';
  f.add('010-fail', "module.exports = {version: 1, migrate: async() => {throw Error('should not run')}}");
  await migrate(f);
  f.runtime.model = () => ({getOptions: async() => {throw Error('no such table: fk_options')}});
  await migrate(f);
  f.runtime.model = () => ({getOptions: async() => {throw Error('connection refused')}});
  await assert.rejects(migrate(f), /connection refused/);
});
