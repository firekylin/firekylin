import {ERROR} from '../constants'

export default class extends think.controller.rest {

  init(http) {
    super.init(http);
    http.action = http.method.toLowerCase();
    this.id = this.get('id');
  }
  /**
   * check user is login
   * @return {Promise} []
   */
  async __before(action){

    this.userInfo = await this.session('userInfo');

    if (!['index', 'session'].includes(action.http.controller)) {
      await this.checkPermission();
    }

    this.assign('base.js')
  }

  async checkPermission() {
    if (think.isEmpty(this.userInfo)) {
      throw this.error(ERROR.UNAUTHORIZED)
    }
  }

  success(data = '', ext = {}) {
    return this.json({status: 200, data: data, ...ext})
  }

  fail(statusCode = 400, message = 'Bad Request') {
    if (isNaN(statusCode)) {
      message = statusCode;
      statusCode = 400;
    }
    return this.json({status: statusCode, error: message});
  }

  error(error) {
    return this.fail(...error);
  }

  encryptPassword(password, md5encoded = false) {
    password = md5encoded ? password : think.md5(password);
    return think.md5(think.md5('fireKylin') + password + think.md5('jedmeng'));
  }

  /**
   * call
   * @return {Promise} []
   */
  __call(){
    return this.error(ERROR.NOT_IMPLEMENTED);
  }

}