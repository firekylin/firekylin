#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function scaffold(destination, id, version) {
  if (!destination || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id || '')) {
    throw new Error('Provide a destination and lowercase hyphenated plugin ID beginning with a letter');
  }
  // Exact stable version deliberately avoids claiming untested compatibility.
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version || '')) {
    throw new Error('Provide the verified stable Firekylin version, e.g. 2.17.1');
  }
  const target = path.resolve(destination);
  const source = path.join(__dirname, '../assets/plugin');
  const files = ['package.json', 'plugin.js', 'config.example.cjs', 'README.md', 'test/plugin.test.cjs'];
  // Read everything before writing; no network, config evaluation, or package installation.
  const contents = files.map(file => fs.readFileSync(path.join(source, file), 'utf8')
    .replaceAll('__PLUGIN_ID__', id).replaceAll('__FIREKYLIN_VERSION__', version));
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.mkdirSync(target); // Fail even for an empty existing directory or a symlink.
  fs.mkdirSync(path.join(target, 'test'));
  files.forEach((file, index) => fs.writeFileSync(path.join(target, file), contents[index], {flag: 'wx'}));
  return target;
}

if (require.main === module) {
  try {
    if (process.argv.length !== 5) throw new Error('Usage: scaffold-plugin.cjs <new-directory> <id> <verified-host-version>');
    console.log(`Generated only: ${scaffold(...process.argv.slice(2))}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = {scaffold};
