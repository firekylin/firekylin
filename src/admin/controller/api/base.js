/**
 * base rest controller
 */
export default class extends think.controller.rest {
  /**
   * allow list for user
   * @type {Array}
   */
  allowList = ['api/post/put', 'api/post/post'];
  /**
   * [constructor description]
   * @param  {[type]} http [description]
   * @return {[type]}      [description]
   */
  constructor(http){
    super(http);
    this._method = 'method';
  }
  /**
   * before
   * @return {} []
   */
  async __before(){
    let userInfo = await this.session('userInfo') || {};
    if(think.isEmpty(userInfo)){
      return this.fail('USER_NOT_LOGIN');
    }
    this.userInfo = userInfo;
    let type = userInfo.type | 0;
    //not admin
    if(type !== 1){
      let action = this.http.action;
      if(action === 'get'){
        return;
      }
      let name = this.http.controller + '/' + this.http.action;
      if(this.allowList.indexOf(name) > -1){
        return;
      }
      return this.fail('USER_NO_PERMISSION');
    }
  }
}
