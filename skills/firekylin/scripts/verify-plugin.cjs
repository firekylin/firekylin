#!/usr/bin/env node
'use strict';

// Static checks only: never require the plugin or its configuration here.
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const {spawnSync} = require('node:child_process');

function verify(pluginPath, corePath) {
  const root = fs.realpathSync(pluginPath);
  const core = fs.realpathSync(corePath);
  const hostManifest = path.join(core, 'package.json');
  const host = JSON.parse(fs.readFileSync(hostManifest, 'utf8'));
  const semver = createRequire(hostManifest)('semver');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const metadata = pkg.firekylin || {};
  if (!pkg.name || !semver.valid(pkg.version) || metadata.type !== 'plugin' ||
      typeof metadata.id !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/i.test(metadata.id)) {
    throw new Error('Expected package name/version and firekylin.type=plugin with a valid id');
  }
  const engine = metadata.engine || pkg.engines?.firekylin;
  if (!engine || !semver.validRange(engine) || !semver.satisfies(host.version, engine)) {
    throw new Error(`Declare an engine compatible with verified host ${host.version}`);
  }
  const entry = metadata.entry || pkg.main;
  if (typeof entry !== 'string' || !entry) throw new Error('Plugin entry is required');
  const resolved = fs.realpathSync(path.resolve(root, entry));
  const relative = path.relative(root, resolved);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
    throw new Error('Plugin entry escapes its root');
  }
  if (!fs.statSync(resolved).isFile()) throw new Error('Entry must be a file');
  if (path.extname(resolved) !== '.cjs' && (path.extname(resolved) !== '.js' || pkg.type === 'module')) {
    throw new Error('Use CommonJS .cjs or .js with commonjs/default package type');
  }
  for (const required of ['README.md', 'config.example.cjs']) {
    if (!fs.statSync(path.join(root, required)).isFile()) throw new Error(`Missing ${required}`);
  }
  let tests = 0;
  function check(directory) {
    for (const item of fs.readdirSync(directory, {withFileTypes: true})) {
      if (['node_modules', '.git'].includes(item.name)) continue;
      const file = path.join(directory, item.name);
      if (item.isSymbolicLink()) throw new Error(`Review symlink before validation: ${file}`);
      if (item.isDirectory()) check(file);
      else if (/\.(cjs|js|mjs)$/.test(item.name)) {
        if (/\.test\.(cjs|js|mjs)$/.test(item.name)) tests++;
        const result = spawnSync(process.execPath, ['--check', file], {encoding: 'utf8', timeout: 10000});
        if (result.error || result.status !== 0) throw new Error(`Syntax check failed: ${file}\n${result.stderr || result.error}`);
      }
    }
  }
  check(root);
  if (!tests) throw new Error('Include executable *.test.cjs/js/mjs behavior tests');
  return {id: metadata.id, hostVersion: host.version, tests, runtimeVerified: false};
}

if (require.main === module) {
  try {
    if (process.argv.length !== 4) throw new Error('Usage: verify-plugin.cjs <plugin-directory> <trusted-firekylin-core>');
    console.log(JSON.stringify(verify(...process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = {verify};
