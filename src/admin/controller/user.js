const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');
const Base = require('./base');

const rememberSessionOpt = {
  maxAge: 365 * 24 * 3600 * 1000
};
const normalSessionOpt = {
  maxAge: 24 * 3600 * 1000
};
module.exports = class extends Base {
  /**
   * login
   * @return {} []
   */
  async loginAction() {
    const { username, remember } = this.post();
    let userInfo = {};
    const model = this.model('options');
    const options = await model.getOptions();

    // 二步验证
    if (options.two_factor_auth) {
      const two_factor_auth = this.post('two_factor_auth');
      const verified = speakeasy.totp.verify({
        secret: options.two_factor_auth,
        encoding: 'base32',
        token: two_factor_auth,
        window: 2
      });
      if (!verified) {
        return this.fail('TWO_FACTOR_AUTH_ERROR');
      }
    }

    const ldapConfig = {
      // switch, maybe, default '0', '0' => close, '1' => open
      ldap_on: options.ldap_on === '1',
      // ldap url, required，'ldap://xxx.xx.x.xx:xxx'
      ldap_url: options.ldap_url,
      // ldap connect timeout, maybe, default 20000ms
      ldap_connect_timeout: parseInt(options.ldap_connect_timeout),
      // ldap baseDn, required
      ldap_baseDn: options.ldap_baseDn,
      // sep by ",", accounts in this string will not be varified with LDAP when LDAP is opened
      // and these accounts can be edited by itself instead of LDAP administrator, required
      ldap_whiteList: options.ldap_whiteList ? options.ldap_whiteList.split(',') : [],
      // url for ldap user to change userinfo, maybe, default ''
      ldap_user_page: options.ldap_user_page,
      // logconf, maybe, default '1', '0' => close, '1' => open
      ldap_log: options.ldap_log !== '0'
    };

    if (ldapConfig.ldap_on && ldapConfig.ldap_whiteList.indexOf(username) === -1) {
      think.logger.info('LDAP', 'VERIFY TYPE');
      userInfo = await this.ldapVerify(username, ldapConfig);
    } else {
      think.logger.info('NORMAL', 'VERIFY TYPE');
      userInfo = await this.normalVerify(username);
    }

    // 帐号是否被禁用，且投稿者不允许登录
    if ((userInfo.status | 0) !== 1 || userInfo.type === 3) {
      return this.fail('ACCOUNT_FORBIDDEN');
    }

    await this.model('user').updateUserLoginTime(userInfo);
    await this.session(
      'userInfo',
      userInfo,
      remember ? rememberSessionOpt : normalSessionOpt
    );
    return this.success();
  }
  /**
   * logout
   * @return {}
   */
  async logoutAction() {
    await this.session('userInfo', '');
    return this.redirect('/');
  }

  /**
   * 域账号登录
   */
  async intranetAction() {
    const { remember } = this.post();
    const { res, req } = this.ctx;

    const authModule = firekylin.require('auth');
    if (!authModule) {
      return this.fail('no auth module');
    }

    const { name, email } = await authModule(req, res);
    const userModel = this.model('user');
    const userInfo = await userModel.where({ name, email, _logic: 'OR' }).find();

    if (think.isEmpty(userInfo)) {
      return this.fail('user not exist!');
    }

    // 帐号是否被禁用，且投稿者不允许登录
    if ((userInfo.status | 0) !== 1 || userInfo.type === 3) {
      return this.fail('ACCOUNT_FORBIDDEN');
    }

    await this.model('user').updateUserLoginTime(userInfo);
    await this.session(
      'userInfo',
      userInfo,
      remember ? rememberSessionOpt : normalSessionOpt
    );
    return this.redirect('/admin');
  }
  /**
   * update user password
   */
  async passwordAction() {
    const userInfo = await this.session('userInfo') || {};
    if (think.isEmpty(userInfo)) {
      return this.fail('USER_NOT_LOGIN');
    }

    const rows = await this.model('user').saveUser({
      password: this.post('password'),
      id: userInfo.id
    }, this.ctx.ip);

    return this.success(rows);
  }

  async forgotAction() {
    const userInfo = await this.session('userInfo') || {};
    if (!think.isEmpty(userInfo)) {
      return this.success();
    }

    if (this.isPost) {
      let user = this.post('user');
      user = await this.model('user').where({
        name: user,
        email: user,
        _logic: 'OR'
      }).find();

      if (think.isEmpty(user)) {
        return this.fail('查无此人');
      }
      if (!user.email) {
        return this.fail('该用户未设置邮箱，不能使用找回密码功能');
      }

      const options = await this.model('options').getOptions();

      const resetTime = Date.now();
      const resetToken = think.md5(user.email + resetTime + Math.random());
      const resetUrl = options.site_url + `/admin/login?reset=1&token=${resetToken}`;

      const transporter = nodemailer.createTransport();
      transporter.sendMail({
        from: 'no-reply@firekylin.lithub.cc',
        to: user.email,
        subject: `【${options.title}】密码重置`,
        text: `你好，${user.name}，点击 ${resetUrl} 进行密码重置，该地址有效期为 1 小时，请及时修改密码。如果您没有申请过密码重置，请忽略该邮件！`
      });

      await think.cache(resetToken, user.name, {
        timeout: 60 * 60 * 1000
      });

      return this.success();
    }

    return this.success();
  }

  async resetAction() {
    const userInfo = await this.session('userInfo') || {};
    if (!think.isEmpty(userInfo)) {
      return this.success();
    }

    if (this.isPost) {
      const { password, token } = this.post();

      const user = await think.cache(token);
      if (think.isEmpty(user)) {
        return this.fail('查无此人');
      }

      const findUser = await this.model('user').where({ name: user }).find();
      if (think.isEmpty(findUser)) {
        return this.fail('查无此人');
      }

      const rows = await this.model('user').saveUser({
        password,
        id: findUser.id
      }, this.ctx.ip);

      await think.cache(token, null);

      return this.success(rows);
    }

    return this.success();
  }

  async normalVerify(username) {
    // 校验帐号和密码
    const userModel = this.model('user');
    const userInfo = await userModel.where({ name: username }).find();
    if (think.isEmpty(userInfo)) {
      return this.fail('ACCOUNT_ERROR');
    }

    // 校验密码
    const password = this.post('password');
    if (!userModel.checkPassword(userInfo, password)) {
      return this.fail('ACCOUNT_ERROR');
    }

    return userInfo;
  }

  async ldapVerify(username, ldapConfig) {
    // ldap校验
    const oripassword = this.post('oripassword');

    const ldap = this.service('ldap', 'admin', ldapConfig);
    const ldapRes = await ldap.validate(username, oripassword);

    if (!ldapRes) {
      return this.fail('ACCOUNT_ERROR');
    }

    if (ldapRes === 'timeout') {
      return this.fail('LDAP_CONNECT_TIMEOUT');
    }

    // ldap校验通过后，在数据库中查询该用户是否存在，若不存在则新增该用户到数据库，若存在则更新用户信息后登录成功
    // 从ldap中获取详细用户信息
    const ldapUserInfo = await ldap.getUserInfo(username);
    let newData = {};

    if (!think.isEmpty(ldapUserInfo)) {
      newData = {
        username,
        email: ldapUserInfo.mail,
        display_name: ldapUserInfo.displayName,
        password: ldapUserInfo.userPassword,
        type: 2,
        status: 1
      };
    }

    // 校验数据库中帐号是否存在
    const userModel = this.model('user');
    let userInfo = await userModel.where({ name: username }).find();

    if (think.isEmpty(userInfo)) {
      // 新增该用户到数据库

      const modelInstance = this.model('user');
      const insertId = await modelInstance.addUser(newData, this.ip());

      think.logger.info(`insertId: ${JSON.stringify(insertId)}`, 'LDAP');

      if (insertId && insertId.type === 'add') {
        userInfo = await userModel.where({ name: username }).find();
      }
      if (insertId && insertId.type === 'exist') {
        return this.fail('ACCOUNT_ERROR');
      }
    } else {
      // 更新数据库用户信息

      const updateData = {
        ...userInfo,
        email: ldapUserInfo.mail,
        display_name: ldapUserInfo.displayName,
        password: ldapUserInfo.userPassword
      };
      const modelInstance = this.model('user');
      const rows = await modelInstance.saveUser(updateData, this.ctx.ip);

      think.logger.info(`affectedRows: ${rows}`, 'USERINFO UPDATED');

      if (rows) {
        userInfo = await userModel.where({ name: username }).find();
      }
    }

    return userInfo;
  }
};
