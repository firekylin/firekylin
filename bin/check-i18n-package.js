'use strict';

const {execFileSync} = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024
}));
const files = new Set(manifest[0].files.map(file => file.path));
for (const file of [
  'src/service/i18n.js',
  'src/service/i18n-resources.js',
  'src/service/i18n-settings.js',
  'src/service/i18n-theme.js',
  'src/locales/zh-CN.json',
  'src/locales/en-US.json',
  'www/theme/firekylin/locales/zh-CN.json',
  'www/theme/firekylin/locales/en-US.json',
  'www/static/dist/.vite/manifest.json'
]) {
  if (!files.has(file)) throw new Error(`Package is missing ${file}`);
}
if (![...files].some(file => /^www\/static\/dist\/assets\/admin-.*\.js$/.test(file))) {
  throw new Error('Package is missing the compiled admin entry');
}
process.stdout.write('Published package includes locale resources and compiled admin assets.\n');
