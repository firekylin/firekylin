const {parse} = require('url');
const BaseRest = require('../rest');

module.exports = class extends BaseRest {
  constructor(...args) {
    super(...args);
    this.allowList = ['api/post/put', 'api/post/post', 'api/post/delete', 'api/file/post', 'api/file/get'];
  }

  async __before() {
    let userInfo = await this.session('userInfo') || {};
    if(think.isEmpty(userInfo)) {
      return this.fail('USER_NOT_LOGIN');
    }

    let action = this.ctx.action;
    if(action !== 'get') {
      let referrer = this.ctx.referrer();
      let {site_url} = await this.model('options').getOptions()

      if(!referrer || !site_url) {
        return this.fail('REFERRER_ERROR');
      }

      let siteUrlHost = parse(site_url).host;
      let referrerHost = parse(referrer).host;
      if(!siteUrlHost || !referrerHost) {
        return this.fail('REFERRER_ERROR');
      }

      if(siteUrlHost.length < referrerHost.length) {
        if(referrerHost.slice(-siteUrlHost.length) !== siteUrlHost) {
          return this.fail('REFERRER_ERROR');
        }
      } else {
        if(siteUrlHost.slice(-referrerHost.length) !== referrerHost) {
          return this.fail('REFERRER_ERROR');
        }
      }
    }

    this.userInfo = userInfo;
    let type = userInfo.type | 0;
    //not admin
    if(type !== 1) {
      if(action === 'get') {
        return;
      }
      let name = this.ctx.controller + '/' + this.ctx.action;
      if(this.allowList.indexOf(name) > -1) {
        return;
      }
      return this.fail('USER_NO_PERMISSION');
    }
  }
}
