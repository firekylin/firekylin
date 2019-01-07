module.exports = class extends think.Logic {
  /**
   * index action logic
   * @return {} []
   */
  indexAction() {

  }
  /**
   * 添加或者修改用户
   * @return {} []
   */
  saveAction() {
    this.allowMethods = 'post';
    this.rules = {

    }
  }
  /**
   * login
   * @return {} []
   */
  loginAction() {
    this.allowMethods = 'get,post';
    if (this.isGet) {
      return;
    }
    this.rules = {
      username: {
        required: true,
        length: { min: 4 }
      },
      password: {
        required: true,
        length: { min: 32, max: 32 }
      },
      factor: {
        regexp: /^\d{6}$/
      },
      remember: {
        boolean: true
      }
    }
  }

  forgotAction() {
    this.allowMethods = 'get,post';

    this.rules = {
      user: {
        required: true
      }
    };
  }
}
