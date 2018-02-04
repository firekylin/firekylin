module.exports = {
  path: 'create',
  getComponent(nextState, callback) {
    callback(null, require('../../component/tag_create'));
  }
}
