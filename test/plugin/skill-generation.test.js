'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const test = require('node:test');
const {scaffold} = require('../../skills/firekylin/scripts/scaffold-plugin.cjs');
const {verify} = require('../../skills/firekylin/scripts/verify-plugin.cjs');

const core = path.resolve(__dirname, '../..');
const version = require('../../package.json').version;

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-skill-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  return {root, target: path.join(root, 'site-message')};
}

test('copied skill generates complete plugin and passes real host integration tests', t => {
  const {root, target} = fixture(t);
  const copied = path.join(root, 'skill');
  fs.cpSync(path.join(core, 'skills/firekylin'), copied, {recursive: true});
  const generated = spawnSync(process.execPath, [path.join(copied, 'scripts/scaffold-plugin.cjs'),
    target, 'site-message', version], {encoding: 'utf8'});
  assert.equal(generated.status, 0, generated.stderr);
  assert.deepEqual(verify(target, core), {id: 'site-message', hostVersion: version, tests: 1, runtimeVerified: false});
  const env = {...process.env, FIREKYLIN_CORE: core};
  delete env.NODE_TEST_CONTEXT;
  const args = ['--test', '--test-reporter=tap', path.join(target, 'test/plugin.test.cjs')];
  const result = spawnSync(process.execPath, args, {
    env, encoding: 'utf8', timeout: 30000
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /# fail 0/);
});

test('scaffold refuses invalid IDs, versions and any existing destination', t => {
  const {root, target} = fixture(t);
  for (const id of ['../outside', 'bad/name', 'Bad', 'bad.id', '', 'x\n']) {
    assert.throws(() => scaffold(target, id, version));
  }
  for (const invalid of ['>=2.0.0', '2.0', '01.0.0', '2.0.0\n']) {
    assert.throws(() => scaffold(target, 'site-message', invalid));
  }
  fs.mkdirSync(target);
  assert.throws(() => scaffold(target, 'site-message', version), /EEXIST/);
  const link = path.join(root, 'link');
  fs.symlinkSync(target, link);
  assert.throws(() => scaffold(link, 'site-message', version), /EEXIST/);
  assert.deepEqual(fs.readdirSync(target), []);
});

test('static checks do not execute source; reject escapes, ESM, incompatibility and missing tests', t => {
  const {root, target} = fixture(t);
  scaffold(target, 'site-message', version);
  const marker = path.join(root, 'executed');
  fs.writeFileSync(path.join(target, 'plugin.js'), `require('fs').writeFileSync(${JSON.stringify(marker)}, 'bad');`);
  verify(target, core);
  assert.equal(fs.existsSync(marker), false);
  const file = path.join(target, 'package.json');
  const original = JSON.parse(fs.readFileSync(file, 'utf8'));
  function manifest(change) { fs.writeFileSync(file, JSON.stringify({...original, ...change})) }
  fs.writeFileSync(path.join(root, 'outside.cjs'), 'module.exports = {};');
  manifest({firekylin: {...original.firekylin, entry: '../outside.cjs'}});
  assert.throws(() => verify(target, core), /escapes/);
  manifest({type: 'module'});
  assert.throws(() => verify(target, core), /CommonJS/);
  manifest({engines: {firekylin: '999.0.0'}});
  assert.throws(() => verify(target, core), /compatible/);
  manifest({});
  fs.unlinkSync(path.join(target, 'plugin.js'));
  fs.symlinkSync(path.join(root, 'outside.cjs'), path.join(target, 'plugin.js'));
  assert.throws(() => verify(target, core), /escapes/);
  fs.unlinkSync(path.join(target, 'plugin.js'));
  fs.writeFileSync(path.join(target, 'plugin.js'), 'module.exports = {};');
  fs.rmSync(path.join(target, 'test'), {recursive: true});
  assert.throws(() => verify(target, core), /executable/);
});
