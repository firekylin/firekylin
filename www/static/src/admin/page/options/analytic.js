module.exports = {
  path: 'analytic',
  getComponent(nextState, callback) {
    callback(null, require('../../component/options_analytic'));
  }
}
