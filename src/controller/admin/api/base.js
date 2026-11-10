const BaseRest = require('../rest');

module.exports = class extends BaseRest {
  __before() {
    // Authentication and authorization run in logic before controller dispatch.
    const {userInfo, authOptions} = this.ctx.state.adminApi;
    this.userInfo = userInfo;
    this.authOptions = authOptions;
  }
};
