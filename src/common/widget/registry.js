const Widget = require('./base');

const widgets = new Map();

function splitName(name) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new TypeError('Widget name must be a non-empty string');
  }
  const fullName = name.trim();
  const separator = fullName.indexOf('@');
  return {
    fullName,
    className: separator === -1 ? fullName : fullName.slice(0, separator)
  };
}

function validateParams(params) {
  const prototype = params && typeof params === 'object' ? Object.getPrototypeOf(params) : null;
  if (!params || typeof params !== 'object' || Array.isArray(params) ||
    (prototype !== Object.prototype && prototype !== null)) {
    throw new TypeError('Widget parameters must be an object');
  }
}

function registerWidget(name, WidgetClass, options = {}) {
  const {className} = splitName(name);
  if (typeof WidgetClass !== 'function' || !(WidgetClass.prototype instanceof Widget)) {
    throw new TypeError(`Widget "${className}" must extend the Widget base class`);
  }
  if (widgets.has(className) && !options.override) {
    throw new Error(`Widget "${className}" is already registered`);
  }
  widgets.set(className, WidgetClass);
  return WidgetClass;
}

function registerWidgetMap(widgetMap, options = {}) {
  if (!widgetMap || typeof widgetMap !== 'object' || Array.isArray(widgetMap)) {
    throw new TypeError('Widget map must be an object');
  }
  return Object.entries(widgetMap).map(([name, WidgetClass]) => {
    registerWidget(name, WidgetClass, options);
    return name;
  });
}

class WidgetFactory {
  constructor(controller) {
    this.controller = controller;
    this.pool = new Map();
  }

  async widget(name, params = {}) {
    let parsed;
    try {
      parsed = splitName(name);
      validateParams(params);
    } catch (error) {
      throw new Error(`Unable to create widget "${String(name)}": ${error.message}`, {cause: error});
    }

    const WidgetClass = widgets.get(parsed.className);
    if (!WidgetClass) {
      throw new Error(`Widget "${parsed.className}" is not registered`);
    }

    // Typecho's object pool is keyed by the complete widget name. Parameters
    // only initialize the first instance; use @alias to request another one.
    const cacheKey = parsed.fullName;
    if (!this.pool.has(cacheKey)) {
      const promise = this.create(parsed.fullName, WidgetClass, params)
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
  registerWidget,
  registerWidgetMap
};
