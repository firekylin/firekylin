'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {PluginInstaller, validatePackage} = require('../../src/service/plugin-installer');

async function setup(t, runner) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'firekylin-plugin-install-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  await fs.writeFile(path.join(root, 'package.json'), '{"name":"site"}\n');
  await fs.writeFile(path.join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  return {root, installer: new PluginInstaller({projectPath: root, runner})};
}

test('installs an exact trusted package without lifecycle scripts', async t => {
  const calls = [];
  const {root, installer} = await setup(t, async(command, args, options) => {
    calls.push({command, args, options});
    return {stdout: 'installed', stderr: ''};
  });
  assert.deepEqual(await installer.install('@firekylin/plugin-demo', '1.2.3'), {
    restartRequired: true, output: 'installed'
  });
  assert.deepEqual(calls[0].args, [
    'add', '--save-exact', '--ignore-scripts', '@firekylin/plugin-demo@1.2.3'
  ]);
  assert.equal(calls[0].options.cwd, root);
  await assert.rejects(fs.access(path.join(root, '.firekylin/package-install.lock')));
});

test('restores dependency files when installation fails', async t => {
  let calls = 0;
  const {root, installer} = await setup(t, async() => {
    calls += 1;
    if (calls === 1) {
      await fs.writeFile(path.join(root, 'package.json'), '{"broken":true}');
      await fs.writeFile(path.join(root, 'pnpm-lock.yaml'), 'broken');
      throw new Error('registry unavailable');
    }
    return {stdout: 'restored', stderr: ''};
  });
  await assert.rejects(installer.install('@firekylin/plugin-demo', '1.0.0'), /registry unavailable/);
  assert.equal(await fs.readFile(path.join(root, 'package.json'), 'utf8'), '{"name":"site"}\n');
  assert.equal(await fs.readFile(path.join(root, 'pnpm-lock.yaml'), 'utf8'), 'lockfileVersion: 9\n');
});

test('rejects untrusted names, ranges, read-only installs and concurrent operations', async t => {
  assert.deepEqual(validatePackage('firekylin-plugin-backup', '1.0.0'), {
    name: 'firekylin-plugin-backup', version: '1.0.0'
  });
  assert.throws(() => validatePackage('other/plugin', '1.0.0'), /UNTRUSTED/);
  assert.throws(() => validatePackage('@firekylin/plugin-demo', '^1.0.0'), /EXACT/);
  const {root, installer} = await setup(t, async() => ({stdout: '', stderr: ''}));
  await fs.mkdir(path.join(root, '.firekylin'));
  await fs.writeFile(path.join(root, '.firekylin/package-install.lock'), 'locked');
  await assert.rejects(installer.install('@firekylin/plugin-demo', '1.0.0'), /IN_PROGRESS/);
  const readOnly = new PluginInstaller({projectPath: root, readOnly: true});
  await assert.rejects(readOnly.install('@firekylin/plugin-demo', '1.0.0'), /READ_ONLY/);
});
