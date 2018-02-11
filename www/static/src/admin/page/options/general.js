module.exports = {
  path: 'general',
  getComponent(nextState, callback) {
    callback(null, require('../../component/options_general'));
  }
}
