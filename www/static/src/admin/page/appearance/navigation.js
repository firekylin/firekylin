module.exports = {
  path: 'navigation',
  getComponent(nextState, callback) {
    callback(null, require('../../component/navigation'));
  }
}
