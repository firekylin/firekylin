'use strict';

const fs = require('fs');
const path = require('path');
const semver = require('semver');
const {readManifest} = require('../plugin/manager');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return null }
}

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}

function manifestId(manifest) {
  return manifest?.firekylin?.id || manifest?.name;
}

function pluginMetadata(root, manifest, status = 'error') {
  const metadata = manifest && manifest.firekylin || {};
  const manifestName = manifest && typeof manifest.name === 'string' ? manifest.name : '';
  const id = typeof metadata.id === 'string' && metadata.id || manifestName || path.basename(root);
  const permissions = metadata.permissions || manifest && manifest.permissions;
  return {
    id,
    name: manifestName || id,
    version: manifest && typeof manifest.version === 'string' ? manifest.version : '0.0.0',
    description: manifest && typeof manifest.description === 'string' ? manifest.description : '',
    author: typeof manifest?.author === 'string' ? manifest.author : manifest?.author?.name || '',
    authorUrl: typeof manifest?.author?.url === 'string' ? manifest.author.url : '',
    permissions: Array.isArray(permissions) ? permissions : [],
    source: root.includes(`${path.sep}node_modules${path.sep}`) ? 'npm' : 'local',
    status
  };
}

function compatibility(manifest, runtime) {
  if (!manifest || typeof manifest !== 'object') return {compatible: false, reasons: ['INVALID_MANIFEST']};
  const engines = manifest.engines || {};
  const firekylinRange = manifest.firekylin && manifest.firekylin.engine || engines.firekylin;
  const reasons = [];
  if (firekylinRange && (!semver.validRange(firekylinRange) ||
    !semver.satisfies(runtime.firekylin, firekylinRange))) reasons.push('FIREKYLIN_VERSION');
  if (engines.node && (!semver.validRange(engines.node) || !semver.satisfies(runtime.node, engines.node))) {
    reasons.push('NODE_VERSION');
  }
  const type = manifest.firekylin && manifest.firekylin.type || manifest.type;
  if (!['plugin', 'theme'].includes(type)) reasons.push('UNSUPPORTED_PACKAGE_TYPE');
  return {compatible: reasons.length === 0, reasons};
}

class PackageCatalog {
  constructor({pluginManager, themesPath, firekylinVersion, nodeVersion = process.version}) {
    this.pluginManager = pluginManager;
    this.themesPath = themesPath;
    this.runtime = {firekylin: firekylinVersion, node: String(nodeVersion).replace(/^v/, '')};
  }

  plugins() {
    if (!this.pluginManager) return [];
    const records = new Map([...this.pluginManager.plugins.values()].map(record => [record.root, record]));
    let roots = [];
    try {
      roots = typeof this.pluginManager.discover === 'function' ? this.pluginManager.discover() : [];
    } catch (error) {
      this.pluginManager.logger?.error?.(`[marketplace] Unable to discover installed plugins: ${error.message}`);
    }
    return [...new Set([...roots, ...records.keys()])].map(root => {
      const record = records.get(root);
      const manifest = record ? record.manifest : readJson(path.join(root, 'package.json'));
      const state = this.pluginManager.states?.get(manifestId(manifest));
      const inactive = state?.enabled === false || (this.pluginManager.stateStore && !state);
      const item = pluginMetadata(root, manifest, record ? record.status : inactive ? 'inactive' : 'error');
      const result = compatibility(manifest, this.runtime);
      item.reasons = result.reasons;
      try {
        const validated = readManifest(root);
        const entry = path.resolve(root, validated.entry);
        if (!isInside(root, entry) || !fs.existsSync(entry) || !fs.statSync(entry).isFile()) {
          item.reasons.push('PLUGIN_ENTRY_MISSING');
        }
      } catch { item.reasons.push('INVALID_PLUGIN_MANIFEST') }
      if (record?.status === 'error') item.reasons.push('PLUGIN_ACTIVATION_FAILED');
      return item;
    }).sort((a, b) => a.id.localeCompare(b.id));
  }

  themes(activeTheme) {
    if (!this.themesPath || !fs.existsSync(this.themesPath)) return [];
    const themesRoot = fs.realpathSync(this.themesPath);
    return fs.readdirSync(this.themesPath, {withFileTypes: true})
      .flatMap(entry => {
        const root = path.join(this.themesPath, entry.name);
        let realRoot;
        try {
          if (!fs.statSync(root).isDirectory()) return [];
          realRoot = fs.realpathSync(root);
        } catch {
          return [];
        }
        if (!isInside(themesRoot, realRoot)) return [];
        const manifest = readJson(path.join(realRoot, 'package.json'));
        if (!manifest) return [];
        return [{
          id: entry.name,
          name: manifest.name || entry.name,
          version: manifest.version || '0.0.0',
          description: manifest.description || '',
          active: entry.name === activeTheme,
          source: 'local'
        }];
      })
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  installed(activeTheme) {
    return {runtime: {...this.runtime}, plugins: this.plugins(), themes: this.themes(activeTheme)};
  }

  check(manifest) {
    return {...compatibility(manifest, this.runtime), runtime: {...this.runtime}};
  }
}

module.exports = {PackageCatalog, compatibility};
