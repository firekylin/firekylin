const captcha = require('../../service/captcha');
const adminAuth = require('../../service/admin-auth');
const adminOptions = require('../../service/admin-options');
const {getAdminAssets} = require('../../service/admin-assets');

let adminAssets;

module.exports = class extends think.Controller {
  async __before() {
    const { controller, action } = this.ctx;
    if (controller === 'admin/user' && action === 'login') {
      return;
    }

    const authOptions = await this.model('options').getOptions(true);
    this.authOptions = authOptions;
    this.ctx.state.jwtSecret = authOptions.jwt_secret || authOptions.comment_jwt_secret;
    const userInfo = adminAuth.currentUser(this.ctx) || {};
    if (think.isEmpty(userInfo)) {
      if (this.isAjax()) {
        return this.fail('NOT_LOGIN');
      }
    }
    this.userInfo = userInfo;
    if (!this.isAjax()) {
      this.assign('userInfo', { id: userInfo.id, name: userInfo.name, type: userInfo.type });
    }
  }

  async __call() {
    if (this.isAjax()) {
      return this.fail('ACTION_NOT_FOUND');
    }
    let options = adminOptions(this.authOptions, Number(this.userInfo.type) === global.firekylin.USER_ADMIN);
    options.analyze_code = escape(options.analyze_code);
    try {
      options.navigation = JSON.parse(options.navigation);
    } catch (e) {
      options.navigation = []
    }
    try {
      options.social_services = await this.service('social-auth').services();
    } catch {
      options.social_services = [];
    }

    if (firekylin.require('auth')) {
      options.intranet = true;
    }

    if (think.isEmpty(this.userInfo)) {
      options = {
        captcha: captcha.publicSettings(options.captcha),
        title: options.title,
        favicon_url: options.favicon_url,
        two_factor_auth: options.two_factor_auth,
        password_salt: options.password_salt,
        ldap_on: options.ldap_on,
        intranet: options.intranet,
        social_services: options.social_services
      };
    }

    this.assign('publicCaptcha', captcha.publicSettings(options.captcha));
    this.assign('options', options);
    this.assign('think', think);
    adminAssets = adminAssets || getAdminAssets(think.ROOT_PATH);
    this.assign('adminAssets', adminAssets);
    this.assign('csrfToken', adminAuth.csrfToken(this.ctx));
    const pluginManager = global.firekylin && global.firekylin.plugins;
    this.assign('pluginAdmin', !think.isEmpty(this.userInfo) &&
      (this.userInfo.type | 0) === global.firekylin.USER_ADMIN && pluginManager
      ? pluginManager.admin.manifest() : []);

    return this.display('admin');
  }
};
