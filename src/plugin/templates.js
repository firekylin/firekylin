'use strict';

class TemplateRegistry {
  constructor() {
    this.functions = new Map();
    this.filters = new Map();
    this.partials = new Map();
    this.slots = new Map();
  }

  register(map, name, handler, pluginId) {
    if (typeof name !== 'string' || !name.trim()) throw new TypeError('Template extension name must be non-empty');
    if (typeof handler !== 'function') throw new TypeError(`Template extension ${name} must be a function`);
    if (map.has(name)) throw new Error(`Template extension already registered: ${name}`);
    map.set(name, {handler, pluginId});
    return () => map.delete(name);
  }

  registerFunction(name, handler, pluginId) { return this.register(this.functions, name, handler, pluginId) }
  registerFilter(name, handler, pluginId) { return this.register(this.filters, name, handler, pluginId) }
  registerPartial(name, handler, pluginId) { return this.register(this.partials, name, handler, pluginId) }

  registerSlot(name, handler, pluginId) {
    const entries = this.slots.get(name) || [];
    entries.push({handler, pluginId});
    this.slots.set(name, entries);
    return () => this.removeSlot(name, handler, pluginId);
  }

  removeSlot(name, handler, pluginId) {
    const entries = (this.slots.get(name) || []).filter(item => item.handler !== handler || item.pluginId !== pluginId);
    if (entries.length) this.slots.set(name, entries); else this.slots.delete(name);
  }

  removePlugin(pluginId) {
    for (const map of [this.functions, this.filters, this.partials]) {
      for (const [name, item] of map) if (item.pluginId === pluginId) map.delete(name);
    }
    for (const [name, entries] of this.slots) {
      const remaining = entries.filter(item => item.pluginId !== pluginId);
      if (remaining.length) this.slots.set(name, remaining); else this.slots.delete(name);
    }
  }

  api(pluginId) {
    return Object.freeze({
      registerFunction: (name, handler) => this.registerFunction(name, handler, pluginId),
      registerFilter: (name, handler) => this.registerFilter(name, handler, pluginId),
      registerPartial: (name, handler) => this.registerPartial(name, handler, pluginId),
      registerSlot: (name, handler) => this.registerSlot(name, handler, pluginId)
    });
  }

  async callFunction(name, args, context) {
    const item = this.functions.get(name);
    if (!item) throw new Error(`Template function not registered: ${name}`);
    return item.handler(args, context);
  }

  async applyFilter(name, value, context) {
    const item = this.filters.get(name);
    if (!item) throw new Error(`Template filter not registered: ${name}`);
    return item.handler(value, context);
  }

  async renderSlot(name, context) {
    const entries = this.slots.get(name) || [];
    return (await Promise.all(entries.map(item => item.handler(context)))).filter(Boolean).join('');
  }
}

module.exports = TemplateRegistry;
