module.exports = {
  path: 'two_factor_auth',
  getComponent(nextState, callback) {
    callback(null, require('../../component/options_2fa'));
  }
}
