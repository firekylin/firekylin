'use strict';

const pack = require('../../../../package.json');
const Base = require('./base');
const {PackageCatalog} = require('../../../service/package-catalog');
const {ThemeInstaller} = require('../../../service/theme-installer');
const {PluginInstaller} = require('../../../service/plugin-installer');
const path = require('path');
const cluster = require('cluster');

module.exports = class extends Base {
  catalog() {
    return new PackageCatalog({
      pluginManager: global.firekylin && global.firekylin.plugins,
      themesPath: think.THEMES_PATH,
      firekylinVersion: pack.version
    });
  }

  getAction() {
    return this.success(this.catalog().installed(this.authOptions.theme));
  }

  postAction() {
    const operation = this.post('operation');
    if (operation) return this.mutate(operation);
    const manifest = this.post('manifest');
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return this.fail('INVALID_MANIFEST');
    return this.success(this.catalog().check(manifest));
  }

  installer() {
    const projectPath = process.env.FIREKYLIN_PROJECT_PATH || think.ROOT_PATH;
    return new ThemeInstaller({
      themesPath: think.THEMES_PATH,
      backupPath: path.join(projectPath, '.firekylin', 'theme-backups'),
      firekylinVersion: pack.version,
      readOnly: Boolean(process.env.VERCEL)
    });
  }

  pluginInstaller() {
    const projectPath = process.env.FIREKYLIN_PROJECT_PATH || think.ROOT_PATH;
    return new PluginInstaller({projectPath, readOnly: Boolean(process.env.VERCEL)});
  }

  async mutate(operation) {
    try {
      if (operation === 'theme.install') {
        const encoded = String(this.post('archive') || '');
        if (encoded.length > 28 * 1024 * 1024) return this.fail('INVALID_THEME_ARCHIVE_SIZE');
        const result = await this.installer().install(Buffer.from(encoded, 'base64'), {
          replace: this.post('replace') === true
        });
        this.reloadActiveTheme(result.id);
        return this.success(result);
      }
      if (operation === 'theme.rollback') {
        const result = await this.installer().rollback(this.post('backup'));
        this.reloadActiveTheme(result.id);
        return this.success(result);
      }
      if (operation === 'theme.backups') return this.success(await this.installer().backups());
      if (operation === 'plugin.install') {
        return this.success(await this.pluginInstaller().install(this.post('name'), this.post('version')));
      }
      if (operation === 'plugin.uninstall') {
        return this.success(await this.pluginInstaller().uninstall(this.post('name')));
      }
      return this.fail('UNSUPPORTED_MARKETPLACE_OPERATION');
    } catch (error) {
      return this.fail(error.message);
    }
  }

  reloadActiveTheme(theme) {
    if (theme === this.authOptions.theme && cluster.isWorker) {
      process.send('think-cluster-reload-workers');
    }
  }
};
