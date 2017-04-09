module.exports = {
  path: 'push',
  getComponent(nextState, callback) {
    callback(null, require('../../component/options_push'));
  }
}
