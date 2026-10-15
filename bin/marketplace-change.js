#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const path = require('path');
const {PluginInstaller} = require('../src/service/plugin-installer');
const {ThemeInstaller} = require('../src/service/theme-installer');
const {validateChange} = require('../src/service/package-deployment');
const pack = require('../package.json');

const MAX_THEME_BYTES = 20 * 1024 * 1024;

async function themeArchive(change, fetcher) {
  const response = await fetcher(change.download, {redirect: 'error', headers: {
    'user-agent': 'Firekylin-Marketplace-Deployment/1'
  }});
  if (!response.ok) throw new Error(`THEME_DOWNLOAD_${response.status}`);
  const length = Number(response.headers.get('content-length') || 0);
  if (length > MAX_THEME_BYTES) throw new Error('THEME_DOWNLOAD_TOO_LARGE');
  const archive = Buffer.from(await response.arrayBuffer());
  if (archive.length > MAX_THEME_BYTES) throw new Error('THEME_DOWNLOAD_TOO_LARGE');
  const actual = `sha512-${crypto.createHash('sha512').update(archive).digest('base64')}`;
  if (actual.length !== change.integrity.length ||
      !crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(change.integrity))) {
    throw new Error('THEME_INTEGRITY_MISMATCH');
  }
  return archive;
}

async function applyChange(change, {projectPath = process.cwd(), fetcher = global.fetch} = {}) {
  validateChange(change);
  if (change.operation.startsWith('plugin.')) {
    const installer = new PluginInstaller({projectPath});
    return change.operation === 'plugin.install'
      ? installer.install(change.name, change.version)
      : installer.uninstall(change.name);
  }
  const archive = await themeArchive(change, fetcher);
  return new ThemeInstaller({themesPath: path.join(projectPath, 'themes'),
    backupPath: path.join(projectPath, '.firekylin', 'theme-backups'), firekylinVersion: pack.version})
    .install(archive, {replace: true});
}

if (require.main === module) {
  let change;
  try { change = JSON.parse(process.env.FIREKYLIN_MARKETPLACE_CHANGE || '') } catch {
    console.error('FIREKYLIN_MARKETPLACE_CHANGE must contain a valid JSON object'); // eslint-disable-line no-console
    process.exitCode = 1;
  }
  if (change) applyChange(change).catch(error => {
    console.error(error.message); // eslint-disable-line no-console
    process.exitCode = 1;
  });
}

module.exports = {applyChange, themeArchive};
