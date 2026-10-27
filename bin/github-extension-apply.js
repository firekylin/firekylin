'use strict';

// Executed by the repository workflow after dependencies are installed without lifecycle scripts.
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const {execFileSync} = require('child_process');
const {validateChange} = require('../src/service/github-extension-dispatch');
const {fetchBuffer} = require('../src/service/extension-registry');
const {ThemeInstaller} = require('../src/service/theme-installer');
const {installedPluginId} = require('../src/service/package-catalog');
const pack = require('../package.json');

async function apply(input, root = process.cwd(), {run = execFileSync, download = fetchBuffer} = {}) {
  const change = validateChange(input);
  const project = path.resolve(root);
  if (!fs.existsSync(path.join(project, 'package.json'))) throw new Error('SITE_PACKAGE_JSON_REQUIRED');
  if (change.operation === 'plugin.delete-local') {
    const plugins = path.join(project, 'plugins');
    const target = path.join(plugins, change.directory);
    if (!fs.existsSync(plugins) || fs.lstatSync(plugins).isSymbolicLink() ||
        !fs.existsSync(target) || fs.lstatSync(target).isSymbolicLink() || !fs.lstatSync(target).isDirectory()) {
      throw new Error('LOCAL_PLUGIN_DIRECTORY_NOT_FOUND');
    }
    if (installedPluginId(target) !== change.id) throw new Error('LOCAL_PLUGIN_ID_MISMATCH');
    fs.rmSync(target, {recursive: true});
    return change;
  }
  if (change.operation.startsWith('plugin.')) {
    const pnpm = fs.existsSync(path.join(project, 'pnpm-lock.yaml'));
    const npm = fs.existsSync(path.join(project, 'package-lock.json'));
    if (pnpm === npm) throw new Error('SITE_LOCKFILE_REQUIRED');
    const command = pnpm ? 'pnpm' : 'npm';
    const args = change.operation === 'plugin.install'
      ? [pnpm ? 'add' : 'install', '--save-exact', '--ignore-scripts', `${change.name}@${change.version}`]
      : [pnpm ? 'remove' : 'uninstall', '--ignore-scripts', change.name];
    run(command, args, {cwd: project, stdio: 'inherit', env: {...process.env, CI: 'true'}});
    return change;
  }
  const themes = path.join(project, 'themes');
  if (fs.existsSync(themes) && fs.lstatSync(themes).isSymbolicLink()) throw new Error('INVALID_THEMES_DIRECTORY');
  const buffer = await download(change.download, {maxBytes: 20 * 1024 * 1024});
  const actual = crypto.createHash('sha512').update(buffer).digest();
  const expected = Buffer.from(change.integrity.slice('sha512-'.length), 'base64');
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw new Error('THEME_INTEGRITY_MISMATCH');
  }
  const backup = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-extension-'));
  try {
    const installer = new ThemeInstaller({themesPath: themes, backupPath: backup, firekylinVersion: pack.version});
    const inspected = await installer.inspect(buffer);
    if (inspected.id !== change.id || inspected.manifest.name !== change.name ||
        inspected.manifest.version !== change.version) throw new Error('THEME_ARCHIVE_METADATA_MISMATCH');
    await installer.install(buffer, {replace: false});
  } finally { fs.rmSync(backup, {recursive: true, force: true}) }
  return change;
}

if (require.main === module) {
  let payload;
  try { payload = JSON.parse(process.env.FIREKYLIN_EXTENSION_CHANGE || '') } catch {
    console.error('INVALID_EXTENSION_CHANGE'); // eslint-disable-line no-console
    process.exit(1);
  }
  apply(payload).then(result => {
    if (process.env.GITHUB_OUTPUT) {
      const output = [`operation=${result.operation}`];
      if (result.id) output.push(`id=${result.id}`);
      if (result.directory) output.push(`directory=${result.directory}`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, output.join('\n') + '\n');
    }
  }).catch(error => {
    console.error(error.message); // eslint-disable-line no-console
    process.exitCode = 1;
  });
}

module.exports = {apply};
