module.exports = {
  path: 'upload',
  getComponent(nextState, callback) {
    callback(null, require('../../component/options_upload'));
  }
}
