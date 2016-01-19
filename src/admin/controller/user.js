'use strict';

import Base from './base.js';

export default class extends Base {
  /**
   * index action
   * @return {Promise} []
   */
  indexAction(){
    //auto render template file index_index.html
    return this.display();
  }
  /**
   * get password salt
   * POST Method for safety
   * @return {String} []
   */
  async saltAction(){
    let username = this.post('username');
    let model = this.model('user');
    let salt = this.options.salt;
    let userInfo = await model.getUserInfo(username, salt);
    if(think.isEmpty(userInfo)){
      return this.fail('USER_NOT_EXIST');
    }
    return this.success({salt: userInfo.salt});
  }
  /**
   * login
   * @return {} []
   */
  async loginAction(){
    if(this.isGet()){
      return this.display();
    }

    await this.session('userInfo', {name: 'firekylin'});

    return this.redirect('/admin');

    let username = this.post('username');
    let model = this.model('user');
    let userInfo = await model.getUserInfo(username);
    if(think.isEmpty(userInfo)){
      return this.fail('USER_NOT_EXIST');
    }

    let password = this.post('password');
    if(password !== userInfo.password){
      return this.fail('PASSWORD_NOT_CORRECT');
    }

    //turn on tow factor auth
    if(this.options.two_factor_auth == 1){
      let factor = this.post('factor');

    }

    await this.session('userInfo', userInfo);
    return this.success();
  }
}