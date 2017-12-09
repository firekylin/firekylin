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
    //二步验证
    let model = this.model('options');
    let options = await model.getOptions();
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

    //校验帐号和密码
    let username = this.post('username');
    let userModel = this.model('user');
    let userInfo = await userModel.where({name: username}).find();
    if(think.isEmpty(userInfo)) {
      return this.fail('ACCOUNT_ERROR');
    }

    //帐号是否被禁用，且投稿者不允许登录
    if((userInfo.status | 0) !== 1 || userInfo.type === 3) {
      return this.fail('ACCOUNT_FORBIDDEN');
    }

    //校验密码
    let password = this.post('password');
    if(!userModel.checkPassword(userInfo, password)) {
      return this.fail('ACCOUNT_ERROR');
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
}
