'use strict';
const fs = require('fs/promises');
const path = require('path');
const {PluginInstaller} = require('./plugin-installer');

async function packageManager(projectPath, manifest) {
  if (manifest.packageManager) {
    const name = manifest.packageManager.split('@')[0];
    if (!['npm', 'pnpm', 'yarn'].includes(name)) throw new Error('UNSUPPORTED_PACKAGE_MANAGER');
    return name;
  }
  for (const [file, name] of [['pnpm-lock.yaml', 'pnpm'], ['yarn.lock', 'yarn'],
    ['package-lock.json', 'npm'], ['npm-shrinkwrap.json', 'npm']]) {
    try { await fs.access(path.join(projectPath, file)); return name } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return 'npm';
}

class CoreUpdater extends PluginInstaller {
  async snapshot() {
    const files = {};
    for (const name of ['package.json', 'pnpm-lock.yaml', 'yarn.lock', 'package-lock.json', 'npm-shrinkwrap.json']) {
      try { files[name] = await fs.readFile(path.join(this.projectPath, name)) } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        files[name] = null;
      }
    }
    return files;
  }

  async update(version, manifest) {
    this.packageManager = await packageManager(this.projectPath, manifest);
    return this.locked(async() => {
      const snapshot = await this.snapshot();
      try {
        const command = this.packageManager === 'npm' ? 'install' : 'add';
        const exact = this.packageManager === 'yarn' ? '--exact' : '--save-exact';
        await this.execute([command, exact, 'firekylin@' + version]);
      } catch (error) {
        await this.restore(snapshot);
        try { await this.execute(['install', '--ignore-scripts']) } catch {
          // Preserve the original failure when dependency recovery also fails.
        }
        await this.restore(snapshot);
        throw error;
      }
      return {restartRequired: true};
    });
  }
}
module.exports = {CoreUpdater, packageManager};
