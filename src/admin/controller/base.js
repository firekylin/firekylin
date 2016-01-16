'use strict';

export default class extends think.controller.base {
  /**
   * before
   */
  async __before(){
    let http = this.http;
    if(http.controller === 'user' && http.action === 'login'){
      return;
    }
    let userInfo = await this.session('userInfo');
    if(think.isEmpty(userInfo)){
      if(this.isAjax()){
        return this.fail(403, 'not login');
      }
      return this.redirect('/admin/login');
    }
    this.userInfo = userInfo;
  }
}