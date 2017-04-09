module.exports = {
  path: 'create',
  getComponent(nextState, callback) {
    callback(null, require('../../component/post_create'));
  }
}
