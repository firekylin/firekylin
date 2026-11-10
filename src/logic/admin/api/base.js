const adminAuth = require('../../../service/admin-auth');
const {parse} = require('url');
const {isLocalReferrer} = require('../../../service/admin-referrer');

module.exports = class extends think.Logic {
  constructor(...args) {
    super(...args);
    this.editorAllowList = [
      'api/post/put', 'api/post/post', 'api/post/delete',
      'api/markdown/post', 'api/chat/post', 'api/ai-editor/post', 'api/ai-image/post',
      'api/file/post',
      'api/attachment/delete',
      'api/post/get', 'api/cate/get', 'api/tag/get',
      'api/attachment/get', 'api/user/get', 'api/options/get', 'api/system/get',
      'api/chat/get', 'api/ai-editor/get'
    ];
  }

  async __before() {
    const authOptions = this.ctx.state.adminApi?.authOptions || await this.model('options').getOptions(true);
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
    const type = Number(userInfo.type);
    const name = this.ctx.controller.replace(/^admin\//, '') + '/' + this.ctx.action;
    const commenterAllowList = [
      'api/comment/get', 'api/comment/post', 'api/user/get', 'api/user/put'
    ];
    // Theme metadata is needed by the article editor; source files and
    // management endpoints remain administrator-only.
    const editorAllowed = this.editorAllowList.includes(name) ||
      (name === 'api/theme/get' && ['templateList', 'themeFields'].includes(this.get('type')));
    const allowed = type === firekylin.USER_ADMIN ||
      (type === firekylin.USER_EDITOR && editorAllowed) ||
      (type === firekylin.USER_COMMENTER && commenterAllowList.includes(name));
    if (!allowed) return this.fail('USER_NO_PERMISSION');
    this.ctx.state.adminApi = {userInfo, authOptions};
  }

  requireCsrf() {
    if (['GET', 'HEAD', 'OPTIONS'].includes(this.ctx.method)) return;
    const token = this.ctx.get('X-CSRF-Token');
    if (!token || token !== adminAuth.csrfToken(this.ctx)) {
      return this.ctx.throw(403, 'CSRF validation failed');
    }
  }
};
