module.exports = class extends think.Controller {
  async __before() {
    const { controller, action } = this.ctx;
    if (controller === 'user' && action === 'login') {
      return;
    }

    let userInfo = await this.session('userInfo') || {};
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
    let model = this.model('options');
    let options = await model.getOptions();
    //不显示具体的密钥
    options.two_factor_auth = !!options.two_factor_auth;
    options.analyze_code = escape(options.analyze_code);
    options.comment.name = escape(options.comment.name);
    try {
      options.navigation = JSON.parse(options.navigation);
    } catch (e) { options.navigation = []; }
    delete options.push_sites; //不显示推送的配置，会有安全问题

    if (firekylin.require('auth')) {
      options.intranet = true;
    }

    if (think.isEmpty(this.userInfo)) {
      options = {
        title: options.title,
        favicon_url: options.favicon_url,
        two_factor_auth: options.two_factor_auth,
        password_salt: options.password_salt,
        ldap_on: options.ldap_on,
        intranet: options.intranet
      };
    }

    this.assign('options', options);
    // this.assign('JSON', JSON);
    return this.display('admin/index_index');
  }
};
