'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {parseDictionary, loadResources} = require('../src/i18n/resources');

const root = path.resolve(__dirname, '..');
const owners = [path.join(root, 'src'), path.join(root, 'www/theme/firekylin')];
for (const owner of owners) {
  const {resources} = loadResources(owner);
  for (const locale of ['zh-CN', 'en-US']) {
    if (!resources[locale]) throw new Error(`Missing ${locale} resource in ${owner}`);
  }
  const sourceKeys = Object.keys(resources['zh-CN']).sort();
  if (JSON.stringify(sourceKeys) !== JSON.stringify(Object.keys(resources['en-US']).sort())) {
    throw new Error(`Locale key mismatch in ${owner}`);
  }
}
const admin = path.join(root, 'www/static/src/locales/en-US.json');
parseDictionary(fs.readFileSync(admin, 'utf8'));
process.stdout.write('Core, admin and bundled theme locale resources are valid.\n');
