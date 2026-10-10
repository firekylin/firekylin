'use strict';

class EventBus {
  constructor({onError} = {}) {
    this.listeners = new Map();
    this.onError = onError || (() => {});
  }

  on(event, handler, options = {}) {
    if (typeof event !== 'string' || !event.trim()) throw new TypeError('Event name must be a non-empty string');
    if (typeof handler !== 'function') throw new TypeError(`Listener for "${event}" must be a function`);
    const listener = {event, handler, priority: Number(options.priority) || 100, pluginId: options.pluginId || 'core'};
    const entries = this.listeners.get(event) || [];
    entries.push(listener);
    entries.sort((a, b) => a.priority - b.priority);
    this.listeners.set(event, entries);
    return () => this.off(listener);
  }

  off(listener) {
    const entries = this.listeners.get(listener.event);
    if (!entries) return false;
    const index = entries.indexOf(listener);
    if (index === -1) return false;
    entries.splice(index, 1);
    if (!entries.length) this.listeners.delete(listener.event);
    return true;
  }

  removePlugin(pluginId) {
    for (const [event, entries] of this.listeners) {
      const remaining = entries.filter(listener => listener.pluginId !== pluginId);
      if (remaining.length) this.listeners.set(event, remaining);
      else this.listeners.delete(event);
    }
  }

  async emit(event, context, options = {}) {
    const entries = [...(this.listeners.get(event) || [])];
    for (const listener of entries) {
      try {
        await listener.handler(context);
      } catch (error) {
        await this.handleError(error, listener, options);
      }
    }
    return context;
  }

  async filter(event, value, context, options = {}) {
    let current = value;
    const entries = [...(this.listeners.get(event) || [])];
    for (const listener of entries) {
      try {
        const next = await listener.handler(current, context);
        if (typeof next !== 'undefined') current = next;
      } catch (error) {
        await this.handleError(error, listener, options);
      }
    }
    return current;
  }

  async handleError(error, listener, options) {
    if (options.failFast) throw error;
    await this.onError(error, listener);
  }
}

module.exports = EventBus;
