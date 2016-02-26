'use strict';

import Base from './base.js';
import speakeasy from 'speakeasy';

export default class extends Base {
  /**
   * login
   * @return {} []
   */
  async loginAction(){
    //二步验证
    let model = this.model('options');
    let options = await model.getOptions();
    if(options.two_factor_auth){
      let two_factor_auth = this.post('two_factor_auth');
      let verified = speakeasy.totp.verify({
        secret: options.two_factor_auth,
        encoding: 'base32',
        token: two_factor_auth,
        window: 2
      });
      if(!verified){
        return this.fail('TWO_FACTOR_AUTH_ERROR');
      }
    }

    //校验帐号和密码
    let username = this.post('username');
    let userModel = this.model('user');
    let userInfo = await userModel.where({name: username}).find();
    if(think.isEmpty(userInfo)){
      return this.fail('ACCOUNT_ERROR');
    }

    //帐号是否被禁用
    if((userInfo.status | 0) !== 1){
      return this.fail('ACCOUNT_FORBIDDEN');
    }

    //校验密码
    let password = this.post('password');
    if(!userModel.checkPassword(userInfo, password)){
      return this.fail('ACCOUNT_ERROR');
    }

    await this.session('userInfo', userInfo);

    return this.success();
  }
  /**
   * logout
   * @return {} 
   */
  async logoutAction(){
    await this.session('userInfo', '');
    return this.redirect('/');
  }
}