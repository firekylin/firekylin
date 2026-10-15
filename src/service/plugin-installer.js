'use strict';

const fs = require('fs/promises');
const path = require('path');
const {spawn} = require('child_process');
const semver = require('semver');

function validatePackage(name, version) {
  if (!/^@firekylin\/plugin-[a-z0-9][a-z0-9._-]*$/.test(String(name || ''))) {
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
  constructor({projectPath, readOnly = false, runner = run, packageManager = 'pnpm'}) {
    this.projectPath = path.resolve(projectPath);
    this.readOnly = readOnly;
    this.runner = runner;
    this.packageManager = packageManager;
    this.statePath = path.join(this.projectPath, '.firekylin');
    this.lockPath = path.join(this.statePath, 'package-install.lock');
  }

  async locked(action) {
    if (this.readOnly) throw new Error('PACKAGE_INSTALLATION_READ_ONLY');
    await fs.mkdir(this.statePath, {recursive: true});
    let lock;
    try {
      lock = await fs.open(this.lockPath, 'wx', 0o600);
      await lock.writeFile(JSON.stringify({pid: process.pid, createdAt: new Date().toISOString()}));
    } catch (error) {
      if (error.code === 'EEXIST') throw new Error('PACKAGE_INSTALLATION_IN_PROGRESS');
      throw error;
    }
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
    if (!/^@firekylin\/plugin-[a-z0-9][a-z0-9._-]*$/.test(String(name || ''))) {
      throw new Error('UNTRUSTED_PLUGIN_PACKAGE');
    }
    return this.mutate(['remove', '--ignore-scripts', name]);
  }
}

module.exports = {PluginInstaller, validatePackage, run};
