module.exports = {
  path: 'edit',
  getComponent(nextState, callback) {
    callback(null, require('../../component/theme_editor'));
  }
}
