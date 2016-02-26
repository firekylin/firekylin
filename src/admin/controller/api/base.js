/**
 * base rest controller
 */
export default class extends think.controller.rest {
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
  }
}
