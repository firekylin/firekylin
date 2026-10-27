'use strict';

const crypto = require('crypto');

const MIGRATION_KEY = 'plugin_state_migration_v1';
const STATE_PREFIX = 'plugin_state_v1_';

function stateKey(id) {
  return STATE_PREFIX + crypto.createHash('sha256').update(id).digest('hex');
}

class PluginStateStore {
  constructor(model) { this.model = model }

  async initialize(ids) {
    const value = await this.model.ensureOption(MIGRATION_KEY, JSON.stringify(ids));
    let legacy;
    try { legacy = JSON.parse(value) } catch { throw new Error('INVALID_PLUGIN_STATE_MIGRATION') }
    if (!Array.isArray(legacy) || !legacy.every(id => typeof id === 'string')) {
      throw new Error('INVALID_PLUGIN_STATE_MIGRATION');
    }
    this.legacy = new Set(legacy);
  }

  async enabled(id) {
    const value = await this.model.getCredentialValue(stateKey(id));
    if (value === undefined) return this.legacy.has(id);
    if (value !== 'enabled' && value !== 'disabled') throw new Error('INVALID_PLUGIN_STATE');
    return value === 'enabled';
  }

  async set(id, enabled) {
    await this.model.setCredentialValue(stateKey(id), enabled ? 'enabled' : 'disabled');
  }
}

module.exports = {PluginStateStore, stateKey, MIGRATION_KEY};
