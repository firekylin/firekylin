module.exports = {
  path: 'import',
  getComponent(nextState, callback) {
    callback(null, require('../../component/import'));
  }
}
