'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const JSZip = require('jszip');
const {ThemeInstaller} = require('../../src/service/theme-installer');

async function archive({id = 'paper', engine = '>=2.10.0', node, files = {}, compression} = {}) {
  const zip = new JSZip();
  zip.file('theme/package.json', JSON.stringify({name: id, version: '1.0.0',
    engines: {firekylin: engine, node}, firekylin: {type: 'theme', id}}));
  zip.file('theme/index.eta', '<h1>Theme</h1>');
  for (const [name, content] of Object.entries(files)) zip.file(`theme/${name}`, content);
  return zip.generateAsync({type: 'nodebuffer', compression});
}

async function setup(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'firekylin-theme-install-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  return {root, installer: new ThemeInstaller({
    themesPath: path.join(root, 'themes'), backupPath: path.join(root, 'backups'),
    firekylinVersion: '2.10.6', now: () => new Date('2026-10-15T12:00:00Z')
  })};
}

test('installs a validated theme archive', async t => {
  const {root, installer} = await setup(t);
  const result = await installer.install(await archive({files: {'assets/app.css': 'body{}'}}));
  assert.equal(result.id, 'paper');
  assert.equal(await fs.readFile(path.join(root, 'themes/paper/index.eta'), 'utf8'), '<h1>Theme</h1>');
  assert.equal(await fs.readFile(path.join(root, 'themes/paper/assets/app.css'), 'utf8'), 'body{}');
});

test('replaces, backs up and rolls back a theme atomically', async t => {
  const {root, installer} = await setup(t);
  await installer.install(await archive({files: {'version.txt': 'one'}}));
  const replaced = await installer.install(await archive({files: {'version.txt': 'two'}}), {replace: true});
  assert.match(replaced.backup, /^paper-20261015T120000Z-/);
  assert.equal(await fs.readFile(path.join(root, 'themes/paper/version.txt'), 'utf8'), 'two');
  await installer.rollback(replaced.backup);
  assert.equal(await fs.readFile(path.join(root, 'themes/paper/version.txt'), 'utf8'), 'one');
  const backups = await installer.backups();
  const displaced = backups.find(name => name !== replaced.backup);
  await installer.rollback(displaced);
  assert.equal(await fs.readFile(path.join(root, 'themes/paper/version.txt'), 'utf8'), 'two');
});

test('rejects incompatible, malformed and read-only installations', async t => {
  const {root, installer} = await setup(t);
  await assert.rejects(installer.install(await archive({engine: '>=3'})), /INCOMPATIBLE/);
  await assert.rejects(installer.install(await archive({node: '>=999'})), /INCOMPATIBLE_NODE_VERSION/);
  const traversal = new JSZip();
  traversal.file('package.json', JSON.stringify({name: '../bad', firekylin: {type: 'theme'}}));
  traversal.file('index.eta', 'x');
  await assert.rejects(installer.install(await traversal.generateAsync({type: 'nodebuffer'})), /INVALID_THEME_ID/);
  const readOnly = new ThemeInstaller({themesPath: path.join(root, 'x'), backupPath: path.join(root, 'y'),
    firekylinVersion: '2.10.6', readOnly: true});
  await assert.rejects(readOnly.install(await archive()), /READ_ONLY/);
});

test('rejects highly compressed archives before materializing their entries', async t => {
  const {installer} = await setup(t);
  const content = Buffer.alloc(50 * 1024 * 1024 + 1);
  const buffer = await archive({files: {'oversized.bin': content}, compression: 'DEFLATE'});
  assert.ok(buffer.length < 20 * 1024 * 1024);
  await assert.rejects(installer.install(buffer), /THEME_ARCHIVE_TOO_LARGE/);
});
