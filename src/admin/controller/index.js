'use strict';

import base from './base.js';

export default class extends base {
  /**
   * home page
   * @return {} []
   */
  indexAction(){
    return this.display();
  }
  /**
   * login page
   * @return {} []
   */
  async loginAction(){
    if(!this.isPost()){
      return this.display();
    }
    let {username, password} = this.post();
    let data = await this.model('user').where({username: username, password: think.md5(password)}).find();
    if(think.isEmpty(data)){
      return this.fail('username or password error');
    }
    await this.session('userInfo', data);
    return this.success();
  }
}