'use strict';

const pack = require('../../../../package.json');
const Base = require('./base');
const adminAuth = require('../../../service/admin-auth');
const {PackageCatalog} = require('../../../service/package-catalog');
const {ThemeInstaller} = require('../../../service/theme-installer');
const {PluginInstaller} = require('../../../service/plugin-installer');
const path = require('path');
const fs = require('fs/promises');
const cluster = require('cluster');
const {readManifest} = require('../../../plugin/manager');

module.exports = class extends Base {
  catalog() {
    return new PackageCatalog({
      pluginManager: global.firekylin && global.firekylin.plugins,
      themesPath: think.THEMES_PATH,
      firekylinVersion: pack.version
    });
  }

  getAction() {
    if (Number(this.userInfo.type) !== 1) return this.fail('USER_NO_PERMISSION');
    return this.success(this.catalog().installed(this.authOptions.theme));
  }

  postAction() {
    if (Number(this.userInfo?.type) !== 1) return this.ctx.throw(403, 'Administrator permission required');
    const csrf = this.ctx.get('X-CSRF-Token');
    if (!csrf || csrf !== adminAuth.csrfToken(this.ctx)) return this.ctx.throw(403, 'CSRF validation failed');
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
      if (operation === 'plugin.enable' || operation === 'plugin.disable') {
        const manager = global.firekylin.plugins;
        const id = this.post('id');
        if (typeof id !== 'string') throw new Error('INVALID_PLUGIN_ID');
        const matches = manager.discover().flatMap(root => {
          try {
            const manifest = readManifest(root);
            return manifest.id === id ? [{manifest, root}] : [];
          } catch { return [] }
        });
        if (matches.length !== 1) throw new Error('PLUGIN_NOT_FOUND_OR_DUPLICATE');
        const enabled = operation === 'plugin.enable';
        if (enabled) {
          const check = this.catalog().check({...matches[0].manifest,
            firekylin: {type: 'plugin', engine: matches[0].manifest.engine}});
          if (!check.compatible) throw new Error(check.reasons.join(', '));
          const entry = path.resolve(matches[0].root, matches[0].manifest.entry);
          const relative = path.relative(matches[0].root, entry);
          if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) {
            throw new Error('INVALID_PLUGIN_ENTRY');
          }
          const stat = await fs.stat(entry).catch(() => null);
          if (!stat?.isFile()) throw new Error('PLUGIN_ENTRY_MISSING');
        }
        await manager.stateStore.set(id, enabled);
        if (cluster.isWorker) process.send('think-cluster-reload-workers');
        return this.success({restartRequired: !cluster.isWorker});
      }
      if (operation === 'plugin.delete-local') {
        if (process.env.VERCEL) throw new Error('PACKAGE_INSTALLATION_READ_ONLY');
        const manager = global.firekylin.plugins;
        const id = this.post('id');
        const matches = manager.discover().filter(root => {
          try { return readManifest(root).id === id } catch { return false }
        });
        if (matches.length !== 1) throw new Error('PLUGIN_NOT_FOUND_OR_DUPLICATE');
        const root = matches[0];
        const base = await fs.realpath(manager.pluginRoot());
        if (path.dirname(root) !== base) throw new Error('INVALID_LOCAL_PLUGIN_PATH');
        const record = manager.plugins.get(id);
        if (record?.status === 'active') throw new Error('PLUGIN_MUST_BE_DISABLED');
        await manager.stateStore.set(id, false);
        await fs.rm(root, {recursive: true});
        return this.success({restartRequired: false});
      }
      if (operation === 'plugin.install') {
        return this.success(await this.pluginInstaller().install(this.post('name'), this.post('version')));
      }
      if (operation === 'plugin.uninstall') {
        const plugin = this.catalog().plugins().find(item => item.name === this.post('name'));
        if (!plugin || plugin.source !== 'npm') throw new Error('PLUGIN_NOT_FOUND');
        if (plugin.status === 'active') throw new Error('PLUGIN_MUST_BE_DISABLED');
        await global.firekylin.plugins.stateStore.set(plugin.id, false);
        const result = await this.pluginInstaller().uninstall(this.post('name'));
        return this.success(result);
      }
      return this.fail('UNSUPPORTED_MARKETPLACE_OPERATION');
    } catch (error) {
      if (error.message === 'PREVENT_NEXT_PROCESS') throw error;
      return this.fail(error.message);
    }
  }

  reloadActiveTheme(theme) {
    if (theme === this.authOptions.theme && cluster.isWorker) {
      process.send('think-cluster-reload-workers');
    }
  }
};
