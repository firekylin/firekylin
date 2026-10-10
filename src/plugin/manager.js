'use strict';

const fs = require('fs');
const path = require('path');
const semver = require('semver');
const EventBus = require('./events');

const REQUIRED_MANIFEST_FIELDS = ['id', 'name', 'version', 'entry'];

function readManifest(pluginRoot) {
  const manifestPath = path.join(pluginRoot, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (typeof manifest[field] !== 'string' || !manifest[field].trim()) {
      throw new Error(`Plugin manifest ${manifestPath} requires ${field}`);
    }
  }
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(manifest.id)) throw new Error(`Invalid plugin id: ${manifest.id}`);
  if (!semver.valid(manifest.version)) throw new Error(`Invalid plugin version for ${manifest.id}`);
  if (manifest.dependencies && !Array.isArray(manifest.dependencies)) {
    throw new Error(`Plugin ${manifest.id} dependencies must be an array`);
  }
  return manifest;
}

function resolveInside(root, entry, label) {
  const resolved = path.resolve(root, entry);
  const relative = path.relative(path.resolve(root), resolved);
  if (relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new Error(`${label} escapes plugin root`);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) throw new Error(`${label} does not exist: ${resolved}`);
  return resolved;
}

class PluginManager {
  constructor({projectPath, config = {}, logger, version = '0.0.0', eventBus} = {}) {
    this.projectPath = projectPath || process.cwd();
    this.config = config || {};
    this.logger = logger || console;
    this.version = version;
    this.events = eventBus || new EventBus({onError: (error, listener) => this.logError(error, listener)});
    this.plugins = new Map();
    this.states = new Map();
  }

  logError(error, listener) {
    const message = `[plugin:${listener.pluginId}] ${error.stack || error.message}`;
    if (this.logger.error) this.logger.error(message);
  }

  pluginRoot() {
    return path.resolve(this.projectPath, this.config.pluginsPath || 'plugins');
  }

  discover() {
    const root = this.pluginRoot();
    if (!fs.existsSync(root)) return [];
    return fs.readdirSync(root, {withFileTypes: true})
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(root, entry.name));
  }

  loadManifest(pluginRoot) {
    const manifest = readManifest(pluginRoot);
    if (this.plugins.has(manifest.id)) throw new Error(`Duplicate plugin id: ${manifest.id}`);
    if (manifest.engine && !semver.satisfies(this.version, manifest.engine)) {
      throw new Error(`Plugin ${manifest.id} requires Firekylin ${manifest.engine}`);
    }
    const entry = resolveInside(pluginRoot, manifest.entry, `Plugin ${manifest.id} entry`);
    delete require.cache[require.resolve(entry)];
    const loaded = require(entry); // eslint-disable-line import/no-dynamic-require
    const plugin = loaded && loaded.default ? loaded.default : loaded;
    if (!plugin || typeof plugin.register !== 'function') throw new Error(`Plugin ${manifest.id} must export register(ctx)`);
    const record = {manifest, root: pluginRoot, entry, plugin, status: 'discovered'};
    this.plugins.set(manifest.id, record);
    return record;
  }

  async load() {
    for (const pluginRoot of this.discover()) {
      try {
        const record = this.loadManifest(pluginRoot);
        this.states.set(record.manifest.id, {enabled: true, version: record.manifest.version});
      } catch (error) {
        this.logger.error?.(`[plugin] Unable to load ${pluginRoot}: ${error.message}`);
      }
    }
    for (const record of this.plugins.values()) await this.activate(record);
    return this.plugins;
  }

  context(record) {
    const pluginId = record.manifest.id;
    return Object.freeze({
      id: pluginId,
      manifest: Object.freeze({...record.manifest}),
      root: record.root,
      events: Object.freeze({
        on: (event, handler, options = {}) => this.events.on(event, handler, {...options, pluginId})
      }),
      logger: this.logger,
      config: Object.freeze((this.config.pluginConfig && this.config.pluginConfig[pluginId]) || {})
    });
  }

  async activate(record) {
    if (record.status === 'active') return;
    try {
      const ctx = this.context(record);
      await record.plugin.register(ctx);
      if (typeof record.plugin.activate === 'function') await record.plugin.activate(ctx);
      record.status = 'active';
      await this.events.emit('plugin.activated', {pluginId: record.manifest.id});
    } catch (error) {
      record.status = 'error';
      this.events.removePlugin(record.manifest.id);
      this.logger.error?.(`[plugin:${record.manifest.id}] activation failed: ${error.stack || error.message}`);
    }
  }

  async deactivate(id) {
    const record = this.plugins.get(id);
    if (!record || record.status !== 'active') return false;
    try {
      if (typeof record.plugin.deactivate === 'function') await record.plugin.deactivate(this.context(record));
    } finally {
      this.events.removePlugin(id);
      record.status = 'inactive';
      await this.events.emit('plugin.deactivated', {pluginId: id});
    }
    return true;
  }
}

module.exports = {PluginManager, readManifest};
