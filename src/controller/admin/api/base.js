const adminAuth = require('../../../service/admin-auth');
const {parse} = require('url');
const BaseRest = require('../rest');
const {isLocalReferrer} = require('./referrer');

module.exports = class extends BaseRest {
  constructor(...args) {
    super(...args);
    this.allowList = [
      'api/post/put', 'api/post/post', 'api/post/delete',
      'api/markdown/post',
      'api/ai/post',
      'api/file/post', 'api/file/get',
      'api/attachment/delete'
    ];
  }

  async __before() {
    const authOptions = await this.model('options').getOptions(true);
    this.authOptions = authOptions;
    this.ctx.state.jwtSecret = authOptions.jwt_secret || authOptions.comment_jwt_secret;
    const userInfo = adminAuth.currentUser(this.ctx) || {};
    if (think.isEmpty(userInfo)) {
      return this.fail('USER_NOT_LOGIN');
    }

    const action = this.ctx.action;
    if (action !== 'get') {
      const referrer = this.ctx.referrer();
      const {site_url} = this.authOptions;

      if (!referrer) {
        return this.fail('REFERRER_ERROR');
      }

      if (!isLocalReferrer(referrer)) {
        if (!site_url) {
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
    }

    this.userInfo = userInfo;
    const type = userInfo.type | 0;
    const name = this.ctx.controller.replace(/^admin\//, '') + '/' + this.ctx.action;
    if (type === 4) {
      const commenterAllowList = [
        'api/comment/get', 'api/comment/post',
        'api/user/get', 'api/user/put'
      ];
      if (commenterAllowList.includes(name)) return;
      return this.fail('USER_NO_PERMISSION');
    }
    // not admin
    if (type !== 1) {
      if (action === 'get') {
        return;
      }
      if (this.allowList.indexOf(name) > -1) {
        return;
      }
      return this.fail('USER_NO_PERMISSION');
    }
  }
};
