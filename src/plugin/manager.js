'use strict';

const fs = require('fs');
const path = require('path');
const {createRequire} = require('module');
const semver = require('semver');
const EventBus = require('./events');
const RouteRegistry = require('./routes');
const TemplateRegistry = require('./templates');
const AbilityRegistry = require('../ability/registry');
const AdminRegistry = require('./admin');
const AIProviderRegistry = require('../ai/registry');
const AIClient = require('../ai/client');
const {registerAIAdmin} = require('../ai/admin');
const {Widget, ContentsWidget, MetasWidget, registerWidget, removeWidgetsBySource} = require('../widget/registry');

const REQUIRED_MANIFEST_FIELDS = ['id', 'name', 'version', 'entry'];

function packageDependencies(manifest) {
  return [manifest.dependencies, manifest.optionalDependencies]
    .filter(dependencies => dependencies && typeof dependencies === 'object' && !Array.isArray(dependencies))
    .flatMap(dependencies => Object.keys(dependencies));
}

function findPackageRoot(entry, packageName) {
  let directory = path.dirname(entry);
  while (true) {
    const manifestPath = path.join(directory, 'package.json');
    if (fs.existsSync(manifestPath)) {
      try {
        if (JSON.parse(fs.readFileSync(manifestPath, 'utf8')).name === packageName) return directory;
      } catch (error) {
        // readManifest reports malformed plugin manifests after discovery.
      }
    }
    const parent = path.dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
}

function findPackageRootFromSearchPaths(projectRequire, packageName) {
  const searchPaths = projectRequire.resolve.paths(packageName) || [];
  for (const searchPath of searchPaths) {
    const packageRoot = path.resolve(searchPath, packageName);
    const relative = path.relative(path.resolve(searchPath), packageRoot);
    if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) continue;
    const manifestPath = path.join(packageRoot, 'package.json');
    if (fs.existsSync(manifestPath) && fs.statSync(manifestPath).isFile()) return packageRoot;
  }
  return null;
}

function readManifest(pluginRoot) {
  const manifestPath = path.join(pluginRoot, 'package.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const metadata = manifest.firekylin || {};
  const normalized = {
    ...manifest,
    ...metadata,
    id: metadata.id || manifest.name,
    entry: metadata.entry || manifest.main,
    engine: metadata.engine || (manifest.engines && manifest.engines.firekylin)
  };
  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (typeof normalized[field] !== 'string' || !normalized[field].trim()) {
      throw new Error(`Plugin package ${manifestPath} requires ${field} or firekylin.${field}`);
    }
  }
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(normalized.id)) throw new Error(`Invalid plugin id: ${normalized.id}`);
  if (!semver.valid(normalized.version)) throw new Error(`Invalid plugin version for ${normalized.id}`);
  if (metadata.dependencies && !Array.isArray(metadata.dependencies)) {
    throw new Error(`Plugin ${normalized.id} firekylin.dependencies must be an array`);
  }
  return normalized;
}

function resolveInside(root, entry, label) {
  const resolved = path.resolve(root, entry);
  const relative = path.relative(path.resolve(root), resolved);
  if (relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new Error(`${label} escapes plugin root`);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) throw new Error(`${label} does not exist: ${resolved}`);
  return resolved;
}

class PluginManager {
  constructor({projectPath, config = {}, logger, version = '0.0.0', eventBus, packageApi, aiStore} = {}) {
    this.projectPath = projectPath || process.cwd();
    this.config = config || {};
    this.logger = logger || console;
    this.version = version;
    this.events = eventBus || new EventBus({onError: (error, listener) => this.logError(error, listener)});
    this.routes = new RouteRegistry();
    this.templates = new TemplateRegistry();
    this.abilities = new AbilityRegistry();
    this.tools = this.abilities; // Compatibility alias for existing plugins and MCP tools.
    this.admin = new AdminRegistry();
    this.aiProviders = new AIProviderRegistry();
    this.aiStore = aiStore;
    this.ai = aiStore ? new AIClient({providers: this.aiProviders, preferences: {
      get: () => aiStore.getPreferences(), set: value => aiStore.setPreferences(value)
    }}) : null;
    this.plugins = new Map();
    this.states = new Map();
    this.packageApi = packageApi;
    registerAIAdmin(this);
  }

  logError(error, listener) {
    const message = `[plugin:${listener.pluginId}] ${error.stack || error.message}`;
    if (this.logger.error) this.logger.error(message);
  }

  pluginRoot() {
    return path.resolve(this.projectPath, this.config.pluginsPath || 'plugins');
  }

  discoverPackages() {
    const projectManifestPath = path.join(this.projectPath, 'package.json');
    if (!fs.existsSync(projectManifestPath)) return [];
    let projectManifest;
    try {
      projectManifest = JSON.parse(fs.readFileSync(projectManifestPath, 'utf8'));
    } catch (error) {
      throw new Error(`Unable to read project manifest ${projectManifestPath}: ${error.message}`, {cause: error});
    }
    const projectRequire = createRequire(projectManifestPath);
    return [...new Set(packageDependencies(projectManifest))].flatMap(packageName => {
      let manifestPath;
      let packageRoot;
      try {
        manifestPath = projectRequire.resolve(`${packageName}/package.json`);
        packageRoot = path.dirname(manifestPath);
      } catch (manifestError) {
        packageRoot = findPackageRootFromSearchPaths(projectRequire, packageName);
        if (!packageRoot) {
          try {
            packageRoot = findPackageRoot(projectRequire.resolve(packageName), packageName);
          } catch (entryError) {
            return [];
          }
        }
        if (!packageRoot) return [];
        manifestPath = path.join(packageRoot, 'package.json');
      }
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        return manifest.firekylin && manifest.firekylin.type === 'plugin' ? [packageRoot] : [];
      } catch (error) {
        this.logger.error?.(`[plugin] Unable to inspect npm package ${packageName}: ${error.message}`);
        return [];
      }
    });
  }

  discover() {
    const root = this.pluginRoot();
    const directories = fs.existsSync(root) ? fs.readdirSync(root, {withFileTypes: true})
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(root, entry.name)) : [];
    return [...new Set([...directories, ...this.discoverPackages()].map(directory => fs.realpathSync(directory)))];
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
    registerAIAdmin(this);
    return this.plugins;
  }

  context(record) {
    const pluginId = record.manifest.id;
    const permissions = Array.isArray(record.manifest.permissions) ? record.manifest.permissions : [];
    return Object.freeze({
      id: pluginId,
      manifest: Object.freeze({...record.manifest}),
      root: record.root,
      events: Object.freeze({
        on: (event, handler, options = {}) => this.events.on(event, handler, {...options, pluginId})
      }),
      routes: Object.freeze({
        register: route => this.routes.register(route, pluginId)
      }),
      templates: this.templates.api(pluginId),
      tools: Object.freeze({
        register: definition => this.tools.register(definition, pluginId),
        list: () => this.tools.list(),
        execute: (name, input, context) => this.tools.execute(name, input, context)
      }),
      admin: Object.freeze({
        registerPanel: definition => this.admin.registerPanel(definition, pluginId),
        registerPage: definition => this.admin.registerPage(definition, pluginId),
        registerForm: definition => this.admin.registerForm(definition, pluginId),
        registerAction: definition => this.admin.registerAction(definition, pluginId),
        registerEditorAction: definition => this.admin.registerEditorAction(definition, pluginId)
      }),
      ai: this.ai ? Object.freeze({
        registerProvider: definition => this.aiProviders.register(definition, pluginId),
        providers: () => this.ai.models(),
        select: (provider, model) => this.ai.select(provider, model),
        generate: (request, context) => this.ai.generate(request, context),
        credentials: Object.freeze({
          get: name => this.aiStore.getCredential(pluginId, name),
          has: name => this.aiStore.hasCredential(pluginId, name),
          set: (name, value) => this.aiStore.setCredential(pluginId, name, value),
          delete: name => this.aiStore.deleteCredential(pluginId, name)
        })
      }) : undefined,
      ...(this.packageApi && permissions.includes('packages:manage') ? {
        packages: Object.freeze({...this.packageApi})
      } : {}),
      widgets: Object.freeze({
        Widget,
        ContentsWidget,
        MetasWidget,
        register: (name, WidgetClass, options = {}) => registerWidget(name, WidgetClass, {
          ...options, layer: 'project', source: pluginId
        })
      }),
      logger: this.logger,
      config: Object.freeze((this.config.pluginConfig && this.config.pluginConfig[pluginId]) || {})
    });
  }

  templateContext(controller) {
    const plugin = {};
    for (const [name] of this.templates.functions) {
      const [pluginId, functionName] = name.split('.', 2);
      plugin[pluginId] = plugin[pluginId] || {};
      plugin[pluginId][functionName] = args => this.templates.callFunction(name, args, {controller});
    }
    return {
      plugin,
      filters: Object.fromEntries([...this.templates.filters].map(([name]) => [
        name, value => this.templates.applyFilter(name, value, {controller})
      ])),
      slots: {render: name => this.templates.renderSlot(name, {controller})}
    };
  }

  async activate(record) {
    if (record.status === 'active') return;
    try {
      const ctx = this.context(record);
      await record.plugin.register(ctx);
      if (typeof record.plugin.activate === 'function') await record.plugin.activate(ctx);
      record.status = 'active';
      registerAIAdmin(this);
      await this.events.emit('plugin.activated', {pluginId: record.manifest.id});
    } catch (error) {
      record.status = 'error';
      this.events.removePlugin(record.manifest.id);
      this.routes.removePlugin(record.manifest.id);
      this.templates.removePlugin(record.manifest.id);
      this.tools.removePlugin(record.manifest.id);
      this.admin.removePlugin(record.manifest.id);
      this.aiProviders.removeOwner(record.manifest.id);
      removeWidgetsBySource(record.manifest.id);
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
      this.routes.removePlugin(id);
      this.templates.removePlugin(id);
      this.tools.removePlugin(id);
      this.admin.removePlugin(id);
      this.aiProviders.removeOwner(id);
      registerAIAdmin(this);
      removeWidgetsBySource(id);
      record.status = 'inactive';
      await this.events.emit('plugin.deactivated', {pluginId: id});
    }
    return true;
  }
}

module.exports = {PluginManager, readManifest};
