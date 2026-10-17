'use strict';

const fs = require('fs/promises');
const path = require('path');
const {spawn} = require('child_process');
const semver = require('semver');

const STALE_LOCK_MS = 24 * 60 * 60 * 1000;

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

function validatePackage(name, version) {
  if (!/^(?:@firekylin\/plugin-|firekylin-plugin-)[a-z0-9][a-z0-9._-]*$/.test(String(name || ''))) {
    throw new Error('UNTRUSTED_PLUGIN_PACKAGE');
  }
  if (!semver.valid(version)) throw new Error('PLUGIN_VERSION_MUST_BE_EXACT');
  return {name, version};
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {...options, shell: false, stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk });
    child.stderr.on('data', chunk => { stderr += chunk });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve({stdout, stderr}) : reject(Object.assign(
      new Error(`Package manager exited with code ${code}: ${stderr.slice(-2000)}`), {code}
    )));
  });
}

class PluginInstaller {
  constructor({projectPath, readOnly = false, runner = run, packageManager = 'pnpm',
    processRunning = isProcessRunning, now = () => Date.now()}) {
    this.projectPath = path.resolve(projectPath);
    this.readOnly = readOnly;
    this.runner = runner;
    this.packageManager = packageManager;
    this.processRunning = processRunning;
    this.now = now;
    this.statePath = path.join(this.projectPath, '.firekylin');
    this.lockPath = path.join(this.statePath, 'package-install.lock');
  }

  async lockIsStale() {
    try {
      const [content, stat] = await Promise.all([fs.readFile(this.lockPath, 'utf8'), fs.stat(this.lockPath)]);
      let owner;
      try { owner = JSON.parse(content) } catch {
        return this.now() - stat.mtimeMs > STALE_LOCK_MS;
      }
      const createdAt = Date.parse(owner.createdAt);
      return !Number.isInteger(owner.pid) || !this.processRunning(owner.pid) ||
        Number.isFinite(createdAt) && this.now() - createdAt > STALE_LOCK_MS;
    } catch (error) {
      if (error.code === 'ENOENT') return true;
      throw error;
    }
  }

  async acquireLock() {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const lock = await fs.open(this.lockPath, 'wx', 0o600);
        try {
          await lock.writeFile(JSON.stringify({pid: process.pid, createdAt: new Date(this.now()).toISOString()}));
          return lock;
        } catch (error) {
          await lock.close();
          await fs.rm(this.lockPath, {force: true});
          throw error;
        }
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        if (!await this.lockIsStale()) throw new Error('PACKAGE_INSTALLATION_IN_PROGRESS');
        const stalePath = `${this.lockPath}.stale-${process.pid}-${Date.now()}`;
        try {
          await fs.rename(this.lockPath, stalePath);
          await fs.rm(stalePath, {force: true});
        } catch (renameError) {
          if (renameError.code !== 'ENOENT') throw renameError;
        }
      }
    }
    throw new Error('PACKAGE_INSTALLATION_IN_PROGRESS');
  }

  async locked(action) {
    if (this.readOnly) throw new Error('PACKAGE_INSTALLATION_READ_ONLY');
    await fs.mkdir(this.statePath, {recursive: true});
    const lock = await this.acquireLock();
    try {
      return await action();
    } finally {
      await lock.close();
      await fs.rm(this.lockPath, {force: true});
    }
  }

  async snapshot() {
    const files = {};
    for (const name of ['package.json', 'pnpm-lock.yaml']) {
      try { files[name] = await fs.readFile(path.join(this.projectPath, name)) } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        files[name] = null;
      }
    }
    return files;
  }

  async restore(files) {
    for (const [name, content] of Object.entries(files)) {
      const target = path.join(this.projectPath, name);
      if (content === null) await fs.rm(target, {force: true});
      else await fs.writeFile(target, content);
    }
  }

  async execute(args) {
    return this.runner(this.packageManager, args, {
      cwd: this.projectPath,
      env: {...process.env, CI: 'true'}
    });
  }

  async mutate(args) {
    return this.locked(async() => {
      const snapshot = await this.snapshot();
      try {
        const result = await this.execute(args);
        return {restartRequired: true, output: result.stdout.slice(-2000)};
      } catch (error) {
        await this.restore(snapshot);
        try {
          await this.execute(['install', '--ignore-scripts', '--frozen-lockfile']);
        } catch {
          // The manifest and lockfile are authoritative even if node_modules cannot be restored immediately.
        }
        throw error;
      }
    });
  }

  install(name, version) {
    validatePackage(name, version);
    return this.mutate(['add', '--save-exact', '--ignore-scripts', `${name}@${version}`]);
  }

  uninstall(name) {
    if (!/^(?:@firekylin\/plugin-|firekylin-plugin-)[a-z0-9][a-z0-9._-]*$/.test(String(name || ''))) {
      throw new Error('UNTRUSTED_PLUGIN_PACKAGE');
    }
    return this.mutate(['remove', '--ignore-scripts', name]);
  }
}

module.exports = {PluginInstaller, validatePackage, run};
