const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const test = require('node:test');

const entrypoint = path.resolve(__dirname, '..', 'docker-entrypoint.sh');

function createLayout() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-entrypoint-'));
  const appPath = path.join(root, 'app');
  const volumePath = path.join(root, 'volume');
  const logLinkPath = path.join(root, 'var-log', 'firekylin');

  fs.mkdirSync(path.join(appPath, 'src', 'config'), {recursive: true});
  fs.mkdirSync(path.join(appPath, 'www', 'static'), {recursive: true});
  fs.mkdirSync(volumePath, {recursive: true});
  fs.mkdirSync(path.dirname(logLinkPath), {recursive: true});

  return {root, appPath, volumePath, logLinkPath};
}

function runEntrypoint(layout) {
  return spawnSync(entrypoint, ['true'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      APP_PATH: layout.appPath,
      VOLUME_PATH: layout.volumePath,
      LOG_LINK_PATH: layout.logLinkPath
    }
  });
}

test('Docker entrypoint can run repeatedly and preserves persistent links', t => {
  const layout = createLayout();
  t.after(() => fs.rmSync(layout.root, {recursive: true, force: true}));

  assert.equal(runEntrypoint(layout).status, 0);
  assert.equal(runEntrypoint(layout).status, 0);
  assert.equal(
    fs.readlinkSync(path.join(layout.appPath, 'src', 'config', 'db.js')),
    path.join(layout.volumePath, 'db.js')
  );
  assert.equal(
    fs.readlinkSync(path.join(layout.appPath, 'www', 'static', 'upload')),
    path.join(layout.volumePath, 'upload')
  );
  assert.equal(fs.readlinkSync(layout.logLinkPath), path.join(layout.appPath, 'logs'));
});

test('Docker entrypoint refuses to replace a regular configuration file', t => {
  const layout = createLayout();
  t.after(() => fs.rmSync(layout.root, {recursive: true, force: true}));

  const configPath = path.join(layout.appPath, 'src', 'config', 'db.js');
  fs.writeFileSync(configPath, 'module.exports = {};\n');

  const result = runEntrypoint(layout);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /already exists and is not a symbolic link/);
});
