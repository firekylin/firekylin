'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const test = require('node:test');
const JSZip = require('jszip');
const {apply} = require('../../bin/github-extension-apply');

function project(t, lock = 'package-lock.json') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-github-test-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.writeFileSync(path.join(root, 'package.json'), '{}');
  if (lock) fs.writeFileSync(path.join(root, lock), '');
  return root;
}

test('updates dependencies with the project package manager and no lifecycle scripts', async t => {
  for (const [lock, command] of [['package-lock.json', 'npm'], ['pnpm-lock.yaml', 'pnpm']]) {
    const root = project(t, lock);
    const calls = [];
    await apply({operation: 'plugin.install', name: 'firekylin-plugin-test', version: '1.0.0'}, root,
      {run: (...args) => calls.push(args)});
    assert.equal(calls[0][0], command);
    assert.ok(calls[0][1].includes('--ignore-scripts'));
    assert.ok(calls[0][1].includes('firekylin-plugin-test@1.0.0'));
    assert.equal(calls[0][2].cwd, root);
  }
  await assert.rejects(apply({operation: 'plugin.uninstall', name: 'firekylin-plugin-test'}, project(t, null)), /SITE_LOCKFILE_REQUIRED/);
});

test('verifies theme archive identity and digest before writing', async t => {
  const root = project(t);
  const zip = new JSZip();
  zip.file('theme/package.json', JSON.stringify({name: 'paper', version: '1.0.0', firekylin: {type: 'theme', id: 'paper'}}));
  zip.file('theme/index.eta', 'hello');
  const buffer = await zip.generateAsync({type: 'nodebuffer'});
  const change = {operation: 'theme.install', id: 'paper', name: 'paper', version: '1.0.0',
    download: 'https://raw.githubusercontent.com/firekylin/themes/main/paper.zip',
    integrity: 'sha512-' + crypto.createHash('sha512').update(buffer).digest('base64')};
  await assert.rejects(apply({...change, integrity: 'sha512-' + Buffer.alloc(64).toString('base64')}, root,
    {download: async () => buffer}), /THEME_INTEGRITY_MISMATCH/);
  assert.equal(fs.existsSync(path.join(root, 'themes/paper')), false);
  await apply(change, root, {download: async () => buffer});
  assert.equal(fs.readFileSync(path.join(root, 'themes/paper/index.eta'), 'utf8'), 'hello');
});
