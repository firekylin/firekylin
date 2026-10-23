'use strict';
const Base = require('./base');
const adminAuth = require('../../../service/admin-auth');
const {FEATURES_KEY, DEFAULTS, normalizeFeatures, editorFeatures} = require('../../../ai/editor-features');

module.exports = class extends Base {
  requireAdministrator() {
    if ((this.userInfo?.type | 0) !== 1) return this.ctx.throw(403, 'Administrator permission required');
  }
  async getAction() {
    this.requireAdministrator();
    const features = await editorFeatures(global.firekylin?.plugins, this.model('options'));
    return this.success({features});
  }
  async postAction() {
    this.requireAdministrator();
    const csrf = this.ctx.get('X-CSRF-Token');
    if (!csrf || csrf !== adminAuth.csrfToken(this.ctx)) return this.ctx.throw(403, 'CSRF validation failed');
    const {features} = this.post() || {};
    if (!features || typeof features !== 'object' || Array.isArray(features) ||
        Object.keys(features).some(key => !Object.hasOwn(DEFAULTS, key) || typeof features[key] !== 'boolean')) {
      return this.ctx.throw(400, 'Invalid feature settings');
    }
    const model = this.model('options');
    const current = await editorFeatures(global.firekylin?.plugins, model);
    const next = normalizeFeatures({...current, ...features});
    await model.updateOptions(FEATURES_KEY, JSON.stringify(next));
    return this.success({features: next, message: '智能内容设置已保存。'});
  }
};
