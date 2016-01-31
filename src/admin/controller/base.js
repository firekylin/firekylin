'use strict';

let Base = think.controller('common/base');

export default class extends Base {
  /**
   * before
   */
  async __before(){
    
    await super.__before();

    let http = this.http;
    if(http.controller === 'user' && http.action === 'login'){
      return;
    }
    let userInfo = await this.session('userInfo');
    if(think.isEmpty(userInfo)){
      if(this.isAjax()){
        return this.fail('NOT_LOGIN');
      }
      return this.redirect('/admin/login');
    }
    this.userInfo = userInfo;
  }
}