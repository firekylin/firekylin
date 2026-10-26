const captcha = require('../../service/captcha');
const adminAuth = require('../../service/admin-auth');
const {CREDENTIAL_PREFIX} = require('../../ai/store');
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
    let options = {...this.authOptions};
    delete options.jwt_secret;
    delete options.comment_jwt_secret;
    delete options.comment_schema_version;
    delete options.ai_credentials;
    for (const key of Object.keys(options)) {
      if (key.startsWith(CREDENTIAL_PREFIX)) delete options[key];
    }
    options.captcha = captcha.publicSettings(captcha.settings(options));
    options.comment = {...options.comment};
    delete options.comment.smtpPass;
    // 不显示具体的密钥
    options.two_factor_auth = !!options.two_factor_auth;
    options.analyze_code = escape(options.analyze_code);
    try {
      options.navigation = JSON.parse(options.navigation);
    } catch (e) { options.navigation = [] }
    delete options.push_sites; // 不显示推送的配置，会有安全问题
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
        captcha: options.captcha,
        title: options.title,
        favicon_url: options.favicon_url,
        two_factor_auth: options.two_factor_auth,
        password_salt: options.password_salt,
        ldap_on: options.ldap_on,
        intranet: options.intranet,
        social_services: options.social_services
      };
    }

    this.assign('options', options);
    this.assign('think', think);
    adminAssets = adminAssets || getAdminAssets(think.ROOT_PATH);
    this.assign('adminAssets', adminAssets);
    this.assign('csrfToken', adminAuth.csrfToken(this.ctx));
    const pluginManager = global.firekylin && global.firekylin.plugins;
    this.assign('pluginAdmin', !think.isEmpty(this.userInfo) && (this.userInfo.type | 0) === 1 && pluginManager
      ? pluginManager.admin.manifest() : []);

    return this.display('admin');
  }
};
