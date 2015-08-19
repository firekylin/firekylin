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
      throw this.error(ERROR.NOT_LOGIN)
    }
  }

  success(data = '', ext = {}) {
    return this.json({errno: ERROR.SUCCESS[0], data: data, ...ext})
  }

  fail(errno, message = 'Bad Request') {
    if (isNaN(errno)) {
      message = errno;
      errno = ERROR.UNKONWN_ERROR[0];
    }
    return this.json({errno: errno, error: message});
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