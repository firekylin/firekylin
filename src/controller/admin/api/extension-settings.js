'use strict';

const Base = require('./base');
const adminAuth = require('../../../service/admin-auth');
const {SETTINGS_KEY, normalizeSettings, readSettings, fetchRegistry} = require('../../../service/extension-registry');

module.exports = class extends Base {
  requireAdministrator() {
    if ((this.userInfo?.type | 0) !== 1) return this.ctx.throw(403, 'Administrator permission required');
  }

  async getAction() {
    this.requireAdministrator();
    const settings = readSettings(await this.model('options').getOptions(true));
    const type = this.get('type');
    if (!type) return this.success({settings});
    if (!['plugin', 'theme'].includes(type)) return this.ctx.throw(400, 'Invalid extension type');
    let items;
    try { items = await fetchRegistry(settings[`${type}Registry`]) } catch (error) {
      return this.ctx.throw(502, `Registry unavailable: ${error.message}`);
    }
    return this.success({items: items.filter(item => item.type === type)});
  }

  async postAction() {
    this.requireAdministrator();
    const token = this.ctx.get('X-CSRF-Token');
    if (!token || token !== adminAuth.csrfToken(this.ctx)) return this.ctx.throw(403, 'CSRF validation failed');
    let settings;
    const body = this.post();
    if (!body || !body.settings) return this.ctx.throw(400, 'Invalid extension settings');
    try { settings = normalizeSettings(body.settings) } catch (error) {
      return this.ctx.throw(400, error.message);
    }
    await this.model('options').updateOptions(SETTINGS_KEY, JSON.stringify(settings));
    return this.success({settings});
  }
};
