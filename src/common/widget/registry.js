const fs = require('fs');
const path = require('path');
const Widget = require('./base');

const layers = {core: new Map(), project: new Map()};
const themeLayers = new Map();
const themeRequestLayers = new Map();

function splitName(name) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new TypeError('Widget name must be a non-empty string');
  }
  const fullName = name.trim();
  const separator = fullName.indexOf('@');
  return {fullName, className: separator === -1 ? fullName : fullName.slice(0, separator)};
}

function validateParams(params) {
  const prototype = params && typeof params === 'object' ? Object.getPrototypeOf(params) : null;
  if (!params || typeof params !== 'object' || Array.isArray(params) ||
    (prototype !== Object.prototype && prototype !== null)) {
    throw new TypeError('Widget parameters must be an object');
  }
}

function registrationError(name, source, existing) {
  return new Error(
    `Widget "${name}" from ${source} is already registered by ${existing.source}; ` +
    'declare it in widgetOverrides to replace the existing widget'
  );
}

function assertWidgetClass(name, WidgetClass) {
  if (typeof WidgetClass !== 'function' || !(WidgetClass.prototype instanceof Widget)) {
    throw new TypeError(`Widget "${name}" must extend the Widget base class`);
  }
}

function registrationFor(name, themeLayer) {
  return (themeLayer && themeLayer.get(name)) || layers.project.get(name) || layers.core.get(name);
}

function normalizeOverrides(overrides) {
  return new Set(overrides.map(name => splitName(name).className));
}

function registerWidget(name, WidgetClass, options = {}) {
  const {className} = splitName(name);
  assertWidgetClass(className, WidgetClass);
  const layerName = options.layer || 'core';
  if (!Object.prototype.hasOwnProperty.call(layers, layerName)) {
    throw new Error(`Unsupported Widget registration layer "${layerName}"`);
  }
  const layer = layers[layerName];
  const source = options.source || layerName;
  const existing = layer.get(className) || (layerName === 'project' ? layers.core.get(className) : null);
  if (existing && !options.override) throw registrationError(className, source, existing);
  layer.set(className, {WidgetClass, source});
  return WidgetClass;
}

function registerWidgetMap(widgetMap, options = {}) {
  if (!widgetMap || typeof widgetMap !== 'object' || Array.isArray(widgetMap)) {
    throw new TypeError('Widget map must be an object');
  }
  const overrides = normalizeOverrides(options.overrides || []);
  return Object.entries(widgetMap).map(([name, WidgetClass]) => {
    const {className} = splitName(name);
    registerWidget(name, WidgetClass, {...options, override: options.override || overrides.has(className)});
    return name;
  });
}

function resolveEntry(root, entry, label) {
  if (typeof entry !== 'string' || !entry.trim()) {
    throw new TypeError(`${label} Widget entry must be a non-empty string`);
  }
  const resolved = path.resolve(root, entry);
  const relative = path.relative(path.resolve(root), resolved);
  if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error(`${label} Widget entry escapes its root: ${resolved}`);
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error(`${label} Widget entry does not exist: ${resolved}`);
  }
  const realRoot = fs.realpathSync(root);
  const realEntry = fs.realpathSync(resolved);
  const realRelative = path.relative(realRoot, realEntry);
  if (realRelative.startsWith('..' + path.sep) || realRelative === '..' || path.isAbsolute(realRelative)) {
    throw new Error(`${label} Widget entry escapes its root through a symbolic link: ${resolved}`);
  }
  return realEntry;
}

function initializeExtension(entryPath, label) {
  let initialize;
  try {
    initialize = require(entryPath); // eslint-disable-line import/no-dynamic-require
  } catch (error) {
    throw new Error(`Unable to load ${label} Widget extension ${entryPath}: ${error.message}`, {cause: error});
  }
  if (typeof initialize !== 'function') {
    throw new TypeError(`${label} Widget extension ${entryPath} must export an initializer function`);
  }
  let widgetMap;
  try {
    widgetMap = initialize({Widget});
  } catch (error) {
    throw new Error(`Unable to initialize ${label} Widget extension ${entryPath}: ${error.message}`, {cause: error});
  }
  if (!widgetMap || typeof widgetMap !== 'object' || Array.isArray(widgetMap) ||
    typeof widgetMap.then === 'function') {
    throw new TypeError(`${label} Widget extension ${entryPath} must return a Widget map synchronously`);
  }
  return widgetMap;
}

function loadProjectWidgets(context) {
  const config = context.config || {};
  const entries = config.widgets || [];
  if (!Array.isArray(entries)) throw new TypeError('firekylin.config.js widgets must be an array');
  const overrides = config.widgetOverrides || [];
  if (!Array.isArray(overrides) || overrides.some(name => typeof name !== 'string')) {
    throw new TypeError('firekylin.config.js widgetOverrides must be an array of Widget names');
  }
  const loaded = [];
  entries.forEach((entry) => {
    const entryPath = resolveEntry(context.projectPath, entry, 'Project');
    const widgetMap = initializeExtension(entryPath, 'Project');
    loaded.push(...registerWidgetMap(widgetMap, {
      layer: 'project', source: entryPath, overrides
    }));
  });
  return loaded;
}

function createThemeLayer(widgetMap, source, overrides) {
  const layer = new Map();
  Object.entries(widgetMap).forEach(([name, WidgetClass]) => {
    const {className} = splitName(name);
    assertWidgetClass(className, WidgetClass);
    if (className === 'Widget_Options') {
      throw new Error(`Theme Widget extension ${source} cannot register Widget_Options`);
    }
    const existing = layer.get(className) || registrationFor(className);
    if (existing && !overrides.has(className)) throw registrationError(className, source, existing);
    layer.set(className, {WidgetClass, source});
  });
  return layer;
}

function loadThemeWidgets(themesPath, theme) {
  if (typeof theme !== 'string' || !theme.trim() || theme.includes('\0')) {
    throw new TypeError('Theme name must be a non-empty string');
  }
  const themesRoot = path.resolve(themesPath);
  const themeRoot = path.resolve(themesRoot, theme);
  const relative = path.relative(themesRoot, themeRoot);
  if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error(`Theme path escapes the themes root: ${themeRoot}`);
  }
  if (themeRequestLayers.has(themeRoot)) return themeRequestLayers.get(themeRoot);
  if (!fs.existsSync(themeRoot) || !fs.statSync(themeRoot).isDirectory()) {
    throw new Error(`Theme directory does not exist: ${themeRoot}`);
  }
  const realThemesRoot = fs.realpathSync(themesRoot);
  const realThemeRoot = fs.realpathSync(themeRoot);
  const realRelative = path.relative(realThemesRoot, realThemeRoot);
  if (realRelative.startsWith('..' + path.sep) || realRelative === '..' || path.isAbsolute(realRelative)) {
    throw new Error(`Theme path escapes the themes root through a symbolic link: ${themeRoot}`);
  }
  if (themeLayers.has(realThemeRoot)) {
    const cached = themeLayers.get(realThemeRoot);
    themeRequestLayers.set(themeRoot, cached);
    return cached;
  }

  const packagePath = path.join(realThemeRoot, 'package.json');
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read theme manifest ${packagePath}: ${error.message}`, {cause: error});
  }
  const config = manifest.firekylin || {};
  if (!config.widgets) {
    themeLayers.set(realThemeRoot, null);
    themeRequestLayers.set(themeRoot, null);
    return null;
  }
  const overrides = config.widgetOverrides || [];
  if (!Array.isArray(overrides) || overrides.some(name => typeof name !== 'string')) {
    throw new TypeError(`Theme manifest ${packagePath} firekylin.widgetOverrides must be an array of Widget names`);
  }
  const entryPath = resolveEntry(realThemeRoot, config.widgets, 'Theme');
  const widgetMap = initializeExtension(entryPath, 'Theme');
  const layer = createThemeLayer(widgetMap, entryPath, normalizeOverrides(overrides));
  themeLayers.set(realThemeRoot, layer);
  themeRequestLayers.set(themeRoot, layer);
  return layer;
}

class WidgetFactory {
  constructor(controller) {
    this.controller = controller;
    this.pool = new Map();
    this.themeLayer = null;
  }

  useTheme(themesPath, theme) {
    this.themeLayer = loadThemeWidgets(themesPath, theme);
  }

  async widget(name, params = {}) {
    let parsed;
    try {
      parsed = splitName(name);
      validateParams(params);
    } catch (error) {
      throw new Error(`Unable to create widget "${String(name)}": ${error.message}`, {cause: error});
    }
    const registration = registrationFor(parsed.className, this.themeLayer);
    if (!registration) throw new Error(`Widget "${parsed.className}" is not registered`);

    const cacheKey = parsed.fullName;
    if (!this.pool.has(cacheKey)) {
      const promise = this.create(parsed.fullName, registration.WidgetClass, params)
        .catch((error) => {
          this.pool.delete(cacheKey);
          throw error;
        });
      this.pool.set(cacheKey, promise);
    }
    return this.pool.get(cacheKey);
  }

  destroy(name) {
    if (typeof name === 'undefined') {
      this.pool.clear();
      return;
    }
    this.pool.delete(splitName(name).fullName);
  }

  async create(name, WidgetClass, params) {
    try {
      const instance = new WidgetClass(this.controller, params);
      await instance.init();
      await instance.execute();
      return instance;
    } catch (error) {
      throw new Error(`Widget "${name}" execution failed: ${error.message}`, {cause: error});
    }
  }
}

module.exports = {
  Widget,
  WidgetFactory,
  loadProjectWidgets,
  loadThemeWidgets,
  registerWidget,
  registerWidgetMap
};
