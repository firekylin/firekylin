module.exports = {
  path: 'export',
  getComponent(nextState, callback) {
    callback(null, require('../../component/export'));
  }
}
