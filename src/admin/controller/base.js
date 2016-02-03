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
    let userInfo = await this.session('userInfo') || {};
    userInfo = {id: 1, username: 'welefen'};
    if(think.isEmpty(userInfo)){
      if(this.isAjax()){
        return this.fail('NOT_LOGIN');
      }
    }
    this.userInfo = userInfo;
    if(!this.isAjax()){
      this.assign('userInfo', userInfo);
    }
  }
  /**
   * call magic method
   * @return {} []
   */
  async __call(){
    if(this.isAjax()){
      return this.fail('ACTION_NOT_FOUND');
    }
    let model = this.model('options');
    let options = await model.getOptions();
    this.assign('options', options);
    return this.display('index/index');
  }
}