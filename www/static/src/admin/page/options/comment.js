module.exports = {
  path: 'comment',
  getComponent(nextState, callback) {
    callback(null, require('../../component/options_comment'));
  }
}
