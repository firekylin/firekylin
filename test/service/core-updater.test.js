'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const {CoreUpdater, packageManager} = require('../../src/service/core-updater');

test('core updates use the project manager and exact dependency arguments', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'core-update-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  for (const name of ['npm', 'pnpm', 'yarn']) {
    const manifest = {dependencies: {firekylin: '2.17.0'}, packageManager: name + '@1.0.0'};
    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(manifest));
    const calls = [];
    const updater = new CoreUpdater({projectPath: root, runner: async(...args) => { calls.push(args) }});
    await updater.update('2.18.0', manifest);
    assert.equal(calls[0][0], name);
    assert.deepEqual(calls[0][1], [name === 'npm' ? 'install' : 'add',
      name === 'yarn' ? '--exact' : '--save-exact', 'firekylin@2.18.0']);
    assert.equal(calls[0][2].cwd, root);
  }
  assert.equal(await packageManager(root, {}), 'npm');
  await fs.writeFile(path.join(root, 'yarn.lock'), 'original');
  assert.equal(await packageManager(root, {}), 'yarn');
  await fs.writeFile(path.join(root, 'pnpm-lock.yaml'), 'original');
  assert.equal(await packageManager(root, {}), 'pnpm');
  assert.equal(await packageManager(root, {packageManager: 'npm@10'}), 'npm');
});

test('failed npm update restores manifest and lockfile', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'core-update-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  await fs.writeFile(path.join(root, 'package.json'), 'original manifest');
  await fs.writeFile(path.join(root, 'package-lock.json'), 'original lock');
  const updater = new CoreUpdater({projectPath: root, runner: async() => {
    await fs.writeFile(path.join(root, 'package.json'), 'changed');
    await fs.writeFile(path.join(root, 'package-lock.json'), 'changed');
    throw new Error('install failed');
  }});
  await assert.rejects(updater.update('2.18.0', {}), /install failed/);
  assert.equal(await fs.readFile(path.join(root, 'package.json'), 'utf8'), 'original manifest');
  assert.equal(await fs.readFile(path.join(root, 'package-lock.json'), 'utf8'), 'original lock');
});
