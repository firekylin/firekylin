'use strict';

export default class extends think.controller.base {
  /**
   * check user is login
   * @return {Promise} []
   */
  async __before(){
    let action = this.http.action;
    let blankList = ['login'];
    if(blankList.indexOf(action) > -1){
      return;
    }
    let session = await this.session('userInfo');
    if(think.isEmpty(session)){
      return this.redirect('/admin/index/login');
    }
    let {username} = session;
    this.assign('base.js')
  }
}