'use strict';

const crypto = require('crypto');

const STATE_PREFIX = 'plugin_state_v1_';

function stateKey(id) {
  return STATE_PREFIX + crypto.createHash('sha256').update(id).digest('hex');
}

class PluginStateStore {
  constructor(model) { this.model = model }

  async enabled(id) {
    const value = await this.model.getCredentialValue(stateKey(id));
    if (value === undefined) return false;
    if (value !== 'enabled' && value !== 'disabled') throw new Error('INVALID_PLUGIN_STATE');
    return value === 'enabled';
  }

  async set(id, enabled) {
    await this.model.setCredentialValue(stateKey(id), enabled ? 'enabled' : 'disabled');
  }
}

module.exports = {PluginStateStore, stateKey};
