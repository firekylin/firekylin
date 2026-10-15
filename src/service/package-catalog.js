'use strict';

const fs = require('fs');
const path = require('path');
const semver = require('semver');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return null }
}

function compatibility(manifest, runtime) {
  if (!manifest || typeof manifest !== 'object') return {compatible: false, reasons: ['INVALID_MANIFEST']};
  const engines = manifest.engines || {};
  const firekylinRange = engines.firekylin || manifest.firekylin && manifest.firekylin.engine;
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
    return [...this.pluginManager.plugins.values()].map(record => ({
      id: record.manifest.id,
      name: record.manifest.name,
      version: record.manifest.version,
      description: record.manifest.description || '',
      permissions: Array.isArray(record.manifest.permissions) ? record.manifest.permissions : [],
      source: record.root.includes(`${path.sep}node_modules${path.sep}`) ? 'npm' : 'local',
      status: record.status
    })).sort((a, b) => a.id.localeCompare(b.id));
  }

  themes(activeTheme) {
    if (!this.themesPath || !fs.existsSync(this.themesPath)) return [];
    return fs.readdirSync(this.themesPath, {withFileTypes: true})
      .filter(entry => entry.isDirectory())
      .flatMap(entry => {
        const root = path.join(this.themesPath, entry.name);
        const manifest = readJson(path.join(root, 'package.json'));
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
