const {parse} = require('url');
const BaseRest = require('../rest');

module.exports = class extends BaseRest {
  constructor(...args) {
    super(...args);
    this.allowList = ['api/post/put', 'api/post/post', 'api/post/delete', 'api/file/post', 'api/file/get'];
  }

  async __before() {
    const userInfo = await this.session('userInfo') || {};
    if (think.isEmpty(userInfo)) {
      return this.fail('USER_NOT_LOGIN');
    }

    const action = this.ctx.action;
    if (action !== 'get') {
      const referrer = this.ctx.referrer();
      const {site_url} = await this.model('options').getOptions();

      if (!referrer || !site_url) {
        return this.fail('REFERRER_ERROR');
      }

      const siteUrlHost = parse(site_url).host;
      const referrerHost = parse(referrer).host;
      if (!siteUrlHost || !referrerHost) {
        return this.fail('REFERRER_ERROR');
      }

      if (siteUrlHost.length < referrerHost.length) {
        if (referrerHost.slice(-siteUrlHost.length) !== siteUrlHost) {
          return this.fail('REFERRER_ERROR');
        }
      } else {
        if (siteUrlHost.slice(-referrerHost.length) !== referrerHost) {
          return this.fail('REFERRER_ERROR');
        }
      }
    }

    this.userInfo = userInfo;
    const type = userInfo.type | 0;
    // not admin
    if (type !== 1) {
      if (action === 'get') {
        return;
      }
      const name = this.ctx.controller + '/' + this.ctx.action;
      if (this.allowList.indexOf(name) > -1) {
        return;
      }
      return this.fail('USER_NO_PERMISSION');
    }
  }
};
