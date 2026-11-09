'use strict';

const cluster = require('node:cluster');
const {createHash} = require('node:crypto');

const EVENT = 'firekylin:options-invalidated';
const TTL = 5000;

class OptionsCache {
  constructor({now = Date.now, ttl = TTL} = {}) {
    this.entries = new Map();
    this.now = now;
    this.ttl = ttl;
    this.messengers = new WeakSet();
  }

  key(model) {
    // Include connection and table identity; never send credentials over IPC.
    return createHash('sha256').update(JSON.stringify([model.config || {}, model.tableName || 'options']))
      .digest('hex');
  }

  bind() {
    const messenger = global.think?.messenger;
    if (!messenger || this.messengers.has(messenger)) return;
    this.messengers.add(messenger);
    messenger.on(EVENT, key => this.entries.delete(key));
  }

  async read(model) {
    this.bind();
    const key = this.key(model);
    let entry = this.entries.get(key);
    if (!entry || entry.expires <= this.now()) {
      entry = {expires: Infinity};
      this.entries.set(key, entry);
      entry.promise = Promise.resolve().then(() => model.select()).then(rows => {
        entry.expires = this.now() + this.ttl;
        return structuredClone(rows);
      })
        .catch(error => {
          if (this.entries.get(key) === entry) this.entries.delete(key);
          throw error;
        });
    }
    // Callers must not be able to modify shared configuration or private values.
    return structuredClone(await entry.promise);
  }

  invalidate(model) {
    this.bind();
    const key = this.key(model);
    this.entries.delete(key);
    if (cluster.isWorker && process.connected && Number(process.env.THINK_WORKERS) > 0) {
      try {
        global.think?.messenger?.broadcast(EVENT, key);
      } catch (error) {
        global.think?.logger?.warn?.(`[options] Cache invalidation broadcast failed: ${error.message}`);
      }
    }
  }
}

module.exports = new OptionsCache();
module.exports.OptionsCache = OptionsCache;
