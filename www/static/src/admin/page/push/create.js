module.exports = {
  path: 'create',
  getComponent(nextState, callback) {
    callback(null, require('../../component/push_create'));
  }
}
