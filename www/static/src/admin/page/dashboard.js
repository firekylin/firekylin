module.exports = {
  path: 'dashboard',
  getComponent(nextState, callback) {
    callback(null, require('../component/Dashboard'));
  }
}
