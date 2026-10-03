'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const packageInfo = require('../../package.json');
const {PasswordHash} = require('phpass');
const {
  detectPackageManager,
  mergeResumeOptions,
  parseArgs,
  scaffold,
  validateNewOptions
} = require('../../lib/cli');
const {hashAdminPassword, quoteIdentifier} = require('../../lib/installer');

function options() {
  return {
    dbType: 'sqlite',
    dbPath: 'data/firekylin.sqlite',
    dbPrefix: 'fk_',
    siteTitle: 'Test',
    siteUrl: 'http://localhost:8360',
    adminUser: 'admin',
    adminPassword: 'secret',
    adminEmail: 'admin@example.com',
    packageManager: 'npm',
    skipInstall: true
  };
}

test('parses start and non-interactive new options', () => {
  assert.deepEqual(parseArgs(['-D']), {options: {development: true}, positional: []});
  const parsed = parseArgs(['new', 'blog', '--non-interactive', '--db-type', 'sqlite', '--skip-install']);
  assert.deepEqual(parsed.positional, ['new', 'blog']);
  assert.equal(parsed.options.dbType, 'sqlite');
  assert.equal(parsed.options.nonInteractive, true);
  assert.equal(parsed.options.skipInstall, true);
  assert.throws(() => parseArgs(['--wat']), /未知参数/);
});

test('detects the invoking package manager', () => {
  assert.equal(detectPackageManager({npm_config_user_agent: 'pnpm/10 node/v22'}), 'pnpm');
  assert.equal(detectPackageManager({npm_config_user_agent: 'yarn/1.22 node/v22'}), 'yarn');
  assert.equal(detectPackageManager({}), 'npm');
});

test('explicit retry arguments override persisted initialization values', () => {
  const config = {database: {type: 'mysql', host: 'bad-host', user: 'old-user', password: 'old-password'}};
  const state = {site: {title: 'Saved', username: 'admin'}};
  const merged = mergeResumeOptions({dbHost: 'fixed-host', dbPassword: 'fixed-password'}, config, state);
  assert.equal(merged.dbHost, 'fixed-host');
  assert.equal(merged.dbUser, 'old-user');
  assert.equal(merged.dbPassword, 'fixed-password');
});

test('quotes option column names for each SQL dialect', () => {
  assert.equal(quoteIdentifier('mysql', 'key'), '`key`');
  assert.equal(quoteIdentifier('postgresql', 'key'), '"key"');
  assert.equal(quoteIdentifier('sqlite', 'value'), '"value"');
});

test('binary packaging preserves the legacy pkg entry point', () => {
  assert.match(packageInfo.scripts['build:pkg'], /pkg pkg\.js/);
});

test('validates required database and administrator fields', () => {
  assert.doesNotThrow(() => validateNewOptions(options()));
  assert.throws(() => validateNewOptions({...options(), adminPassword: ''}), /adminPassword/);
});

test('hashes administrator passwords in the same format as the browser login', () => {
  const salt = 'site-salt';
  const stored = hashAdminPassword(salt, 'secret-password');
  const browserPassword = require('node:crypto').createHash('md5')
    .update(`${salt}secret-password`)
    .digest('hex');
  assert.equal(new PasswordHash().checkPassword(browserPassword, stored), true);
  assert.equal(new PasswordHash().checkPassword('secret-password', stored), false);
});

test('scaffolds an isolated project and only resumes marked directories', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-scaffold-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const target = path.join(root, 'blog');
  const result = scaffold(target, options());
  const manifest = JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8'));
  assert.equal(manifest.dependencies.firekylin, packageInfo.version);
  assert.equal(manifest.scripts.start, 'firekylin');
  assert.ok(fs.existsSync(path.join(target, 'themes', 'firekylin', 'index.eta')));
  const typesPath = path.join(target, 'firekylin.d.ts');
  assert.equal(fs.readFileSync(typesPath, 'utf8'), '/// <reference types="firekylin" />\n');
  assert.equal(fs.statSync(path.join(target, 'firekylin.config.js')).mode & 0o777, 0o600);
  assert.ok(fs.existsSync(result.statePath));
  assert.equal(scaffold(target, options()).resuming, true);
  assert.equal(fs.readFileSync(typesPath, 'utf8'), '/// <reference types="firekylin" />\n');

  const unrelated = path.join(root, 'unrelated');
  fs.mkdirSync(unrelated);
  fs.writeFileSync(path.join(unrelated, 'file.txt'), 'keep');
  assert.throws(() => scaffold(unrelated, options()), /非空/);
});
