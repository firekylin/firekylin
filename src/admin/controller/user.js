'use strict';
import nodemailer from 'nodemailer';
import speakeasy from 'speakeasy';
import Base from './base';

export default class extends Base {
  /**
   * login
   * @return {} []
   */
  async loginAction() {
    const username = this.post('username');
    let userInfo = {};
    let model = this.model('options');
    let options = await model.getOptions();

    //二步验证
    if(options.two_factor_auth) {
      let two_factor_auth = this.post('two_factor_auth');
      let verified = speakeasy.totp.verify({
        secret: options.two_factor_auth,
        encoding: 'base32',
        token: two_factor_auth,
        window: 2
      });
      if(!verified) {
        return this.fail('TWO_FACTOR_AUTH_ERROR');
      }
    }
    const ldapConfig = {
      ldap_on: options.ldap_on === '1', //switch, maybe, default '0', '0' => close, '1' => open
      ldap_url: options.ldap_url, //ldap url, required，'ldap://xxx.xx.x.xx:xxx'
      ldap_connect_timeout: parseInt(options.ldap_connect_timeout), // ldap connect timeout, maybe, default 20000ms
      ldap_baseDn: options.ldap_baseDn, //ldap baseDn, required
      ldap_whiteList: options.ldap_whiteList ? options.ldap_whiteList.split(',') : [], //sep by ",", accounts in this string will not be varified with LDAP when LDAP is opened, and these accounts can be edited by itself instead of LDAP administrator, required
      ldap_user_page: options.ldap_user_page, //url for ldap user to change userinfo, maybe, default ''
      ldap_log: !options.ldap_log === '0' //logconf, maybe, default '1', '0' => close, '1' => open
    }

    if(ldapConfig.ldap_on && ldapConfig.ldap_whiteList.indexOf(username) === -1) {
      think.log('LDAP', 'VARIFY TYPE');
      userInfo = await this.ldapVarify(username, ldapConfig);
    }else {
      think.log('NORMAL', 'VARIFY TYPE');
      userInfo = await this.normalVerify(username);
    }

    //帐号是否被禁用，且投稿者不允许登录
    if((userInfo.status | 0) !== 1 || userInfo.type === 3) {
      return this.fail('ACCOUNT_FORBIDDEN');
    }

    await this.session('userInfo', userInfo);

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
   * update user password
   */
  async passwordAction() {
    let userInfo = await this.session('userInfo') || {};
    if(think.isEmpty(userInfo)) {
      return this.fail('USER_NOT_LOGIN');
    }

    let rows = await this.model('user').saveUser({
      password: this.post('password'),
      id: userInfo.id
    }, this.ip());

    return this.success(rows);
  }

  async forgotAction() {
    let userInfo = await this.session('userInfo') || {};
    if(!think.isEmpty(userInfo)) {
      return this.success();
    }

    if(this.isPost()) {
      let user = this.post('user');
      user = await this.model('user').where({
        name: user,
        email: user,
        _logic: 'OR'
      }).find();

      if(think.isEmpty(user)) {
        return this.fail('查无此人');
      }
      if(!user.email) {
        return this.fail('该用户未设置邮箱，不能使用找回密码功能');
      }

      let options = await this.model('options').getOptions();

      let resetTime = Date.now();
      let resetToken = think.md5(user.email + resetTime + Math.random());
      let resetUrl = options.site_url + `/admin/dashboard?reset=1&token=${resetToken}`;

      let transporter = nodemailer.createTransport();
      transporter.sendMail({
        from: 'no-reply@firekylin.org',
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
    let userInfo = await this.session('userInfo') || {};
    if(!think.isEmpty(userInfo)) {
      return this.success();
    }

    if(this.isPost()) {
      let {password, token} = this.post();

      let user = await think.cache(token);
      if(think.isEmpty(user)) {
        return this.fail('查无此人');
      }

      let findUser = await this.model('user').where({name: user}).find();
      if(think.isEmpty(findUser)) {
        return this.fail('查无此人');
      }

      let rows = await this.model('user').saveUser({
        password,
        id: findUser.id
      }, this.ip());

      await think.cache(token, null);

      return this.success(rows);
    }

    return this.success();
  }

  async normalVerify(username) {
    //校验帐号和密码
    let userModel = this.model('user');
    let userInfo = await userModel.where({name: username}).find();
    if(think.isEmpty(userInfo)) {
      return this.fail('ACCOUNT_ERROR');
    }

    //帐号是否被禁用，且投稿者不允许登录
   /*  if((userInfo.status | 0) !== 1 || userInfo.type === 3) {
      return this.fail('ACCOUNT_FORBIDDEN');
    } */

    //校验密码
    let password = this.post('password');
    if(!userModel.checkPassword(userInfo, password)) {
      return this.fail('ACCOUNT_ERROR');
    }

    return userInfo;
  }

  async ldapVarify(username, ldapConfig) {
    //ldap校验
    const oripassword = this.post('oripassword');

    const Ldap = think.service('ldap/index', 'admin');
    const ldap = new Ldap(ldapConfig);
    const ldapRes = await ldap.validate(username, oripassword);

    if(!ldapRes) {
        return this.fail('ACCOUNT_ERROR');
    }

    if(ldapRes === 'timeout') {
        return this.fail('LDAP_CONNECT_TIMEOUT');
    }

    //ldap校验通过后，在数据库中查询该用户是否存在，若不存在则新增该用户到数据库，若存在则更新用户信息后登录成功
    //从ldap中获取详细用户信息
    let ldapUserInfo = await ldap.getUserInfo(username);
    let newData = {};

    if(!think.isEmpty(ldapUserInfo)) {
        newData = {
            username,
            email: ldapUserInfo.mail,
            display_name: ldapUserInfo.displayName,
            password: ldapUserInfo.userPassword,
            type: 2,
            status: 1
        }
    }

    //校验数据库中帐号是否存在
    let userModel = this.model('user');
    let userInfo = await userModel.where({name: username}).find();

    if(think.isEmpty(userInfo)) {
      //新增该用户到数据库

      let modelInstance = this.model('user');
      let insertId = await modelInstance.addUser(newData, this.ip());

      think.log(`insertId: ${JSON.stringify(insertId)}`, 'LDAP');

      if(insertId && insertId.type === 'add') {
          userInfo = await userModel.where({name: username}).find();
      }
      if(insertId && insertId.type === 'exist') {
        return this.fail('ACCOUNT_ERROR');
      }
    }else {
      //更新数据库用户信息

      let updateData = {
        ...userInfo,
        email: ldapUserInfo.mail,
        display_name: ldapUserInfo.displayName,
        password: ldapUserInfo.userPassword
      }
      let modelInstance = this.model('user');
      let rows = await modelInstance.saveUser(updateData, this.ip());

      think.log(`affectedRows: ${rows}`, 'USERINFO UPDATED');

      if(rows) {
        userInfo = await userModel.where({name: username}).find();
      }
    }

    return userInfo;
  }
}
