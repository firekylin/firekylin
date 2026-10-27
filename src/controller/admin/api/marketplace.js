'use strict';

const pack = require('../../../../package.json');
const Base = require('./base');
const adminAuth = require('../../../service/admin-auth');
const {PackageCatalog, installedPluginId} = require('../../../service/package-catalog');
const {ThemeInstaller} = require('../../../service/theme-installer');
const {PluginInstaller, validatePackage} = require('../../../service/plugin-installer');
const {readSettings, fetchBuffer, fetchRegistry} = require('../../../service/extension-registry');
const crypto = require('crypto');
const semver = require('semver');
const path = require('path');
const fs = require('fs/promises');
const cluster = require('cluster');
const {readManifest} = require('../../../plugin/manager');
const {ExtensionGitHub} = require('../../../service/extension-github');
const {GitHubExtensionDispatch} = require('../../../service/github-extension-dispatch');

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
    return this.success({...this.catalog().installed(this.authOptions.theme),
      pluginAdmin: global.firekylin?.plugins?.admin?.manifest() || []});
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

  async githubConnection() {
    return new ExtensionGitHub(this.model('options')).connection();
  }

  async mutate(operation) {
    try {
      const repositoryOperations = ['theme.install-registry', 'theme.update-registry', 'theme.install',
        'theme.rollback', 'plugin.delete-local', 'plugin.install-registry', 'plugin.update-registry',
        'plugin.install', 'plugin.uninstall'];
      const connection = repositoryOperations.includes(operation)
        ? await this.githubConnection() : null;
      const dispatch = change => new GitHubExtensionDispatch({connection}).dispatch(change);
      if (connection && ['theme.install', 'theme.rollback', 'plugin.install'].includes(operation)) {
        throw new Error('GITHUB_OPERATION_NOT_SUPPORTED');
      }
      if (operation === 'theme.install-registry' || operation === 'theme.update-registry') {
        const updating = operation === 'theme.update-registry';
        const name = this.post('name');
        const version = this.post('version');
        if (typeof name !== 'string' || !name || !semver.valid(version)) throw new Error('INVALID_THEME_SELECTION');
        const installer = this.installer();
        if (!connection) installer.assertWritable();
        const settings = readSettings(await this.model('options').getOptions(true));
        const entries = (await fetchRegistry(settings.themeRegistry))
          .filter(item => item.type === 'theme' && item.name === name && item.version === version);
        if (entries.length !== 1) throw new Error('THEME_NOT_IN_REGISTRY');
        const item = entries[0];
        const id = item.id || item.name;
        if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/i.test(id)) throw new Error('INVALID_THEME_ID');
        if (updating) {
          const installed = this.catalog().themes(this.authOptions?.theme).find(theme => theme.id === id);
          if (!installed || installed.name !== name) throw new Error('THEME_NOT_FOUND');
          if (!semver.valid(installed.version) || !semver.gt(version, installed.version)) {
            throw new Error('THEME_VERSION_NOT_NEWER');
          }
        }
        const check = this.catalog().check({...item, firekylin: {...item.firekylin, type: 'theme'}});
        if (!check.compatible) throw new Error(check.reasons.join(', '));
        const match = /^sha512-([A-Za-z0-9+/]{86}==)$/.exec(String(item.integrity || ''));
        if (!match || typeof item.download !== 'string') throw new Error('THEME_INTEGRITY_REQUIRED');
        const buffer = await fetchBuffer(item.download, {maxBytes: 20 * 1024 * 1024});
        const digest = crypto.createHash('sha512').update(buffer).digest();
        const expected = Buffer.from(match[1], 'base64');
        if (expected.length !== digest.length || !crypto.timingSafeEqual(expected, digest)) {
          throw new Error('THEME_INTEGRITY_MISMATCH');
        }
        const inspected = await installer.inspect(buffer);
        if (inspected.id !== id || inspected.manifest.version !== version || inspected.manifest.name !== name) {
          throw new Error('THEME_ARCHIVE_METADATA_MISMATCH');
        }
        if (connection) return this.success(await dispatch({
          operation: updating ? 'theme.update' : 'theme.install', inspected
        }));
        const result = await installer.install(buffer, {replace: updating});
        if (updating) this.reloadActiveTheme(result.id);
        return this.success(result);
      }
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
        if (!connection && process.env.VERCEL) throw new Error('PACKAGE_INSTALLATION_READ_ONLY');
        const manager = global.firekylin.plugins;
        const id = this.post('id');
        const matches = manager.discover().filter(root => installedPluginId(root) === id);
        if (matches.length !== 1) throw new Error('PLUGIN_NOT_FOUND_OR_DUPLICATE');
        const root = matches[0];
        const base = await fs.realpath(manager.pluginRoot());
        if (path.dirname(root) !== base) throw new Error('INVALID_LOCAL_PLUGIN_PATH');
        const record = manager.plugins.get(id);
        if (record?.status === 'active') throw new Error('PLUGIN_MUST_BE_DISABLED');
        if (connection) return this.success(await dispatch({operation: 'plugin.delete-local',
          id, directory: path.basename(root)}));
        await manager.stateStore.set(id, false);
        await fs.rm(root, {recursive: true});
        if (record?.root === root) manager.plugins.delete(id);
        manager.states?.delete(id);
        return this.success({restartRequired: false});
      }
      if (operation === 'plugin.install-registry' || operation === 'plugin.update-registry') {
        const updating = operation === 'plugin.update-registry';
        const name = this.post('name');
        const version = this.post('version');
        validatePackage(name, version);
        const settings = readSettings(await this.model('options').getOptions(true));
        const entries = (await fetchRegistry(settings.pluginRegistry))
          .filter(item => item.type === 'plugin' && item.name === name && item.version === version);
        if (entries.length !== 1) throw new Error('PLUGIN_NOT_IN_REGISTRY');
        const manifest = entries[0];
        const check = this.catalog().check({...manifest,
          firekylin: {...manifest.firekylin, type: 'plugin'}, engines: manifest.engines || {}});
        if (!check.compatible) throw new Error(check.reasons.join(', '));
        const installed = this.catalog().plugins().filter(item => item.name === name);
        if (!updating && installed.length) throw new Error('PLUGIN_ALREADY_INSTALLED');
        if (updating) {
          if (installed.length !== 1 || installed[0].source !== 'npm') throw new Error('PLUGIN_NOT_FOUND');
          if (!semver.valid(installed[0].version) || !semver.gt(version, installed[0].version)) {
            throw new Error('PLUGIN_VERSION_NOT_NEWER');
          }
        }
        if (connection) return this.success(await dispatch({
          operation: updating ? 'plugin.update' : 'plugin.install', name, version
        }));
        return this.success(await this.pluginInstaller().install(name, version));
      }
      if (operation === 'plugin.install') {
        return this.success(await this.pluginInstaller().install(this.post('name'), this.post('version')));
      }
      if (operation === 'plugin.uninstall') {
        const plugin = this.catalog().plugins().find(item => item.name === this.post('name'));
        if (!plugin || plugin.source !== 'npm') throw new Error('PLUGIN_NOT_FOUND');
        if (plugin.status === 'active') throw new Error('PLUGIN_MUST_BE_DISABLED');
        if (connection) return this.success(await dispatch({operation: 'plugin.uninstall', name: plugin.name}));
        await global.firekylin.plugins.stateStore.set(plugin.id, false);
        const result = await this.pluginInstaller().uninstall(this.post('name'));
        return this.success(result);
      }
      return this.fail('UNSUPPORTED_MARKETPLACE_OPERATION');
    } catch (error) {
      if (error.message === 'PREVENT_NEXT_PROCESS') throw error;
      if (error.message === 'GITHUB_LOCKFILE_NOT_SUPPORTED') {
        return this.fail('网站仓库已跟踪依赖锁文件，请先移除锁文件后再管理插件');
      }
      return this.fail(error.message);
    }
  }

  reloadActiveTheme(theme) {
    if (theme === this.authOptions.theme && cluster.isWorker) {
      process.send('think-cluster-reload-workers');
    }
  }
};
