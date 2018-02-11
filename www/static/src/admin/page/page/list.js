module.exports = {
  path: 'list',
  getComponent(nextState, callback) {
    callback(null, require('../../component/page_list'));
  }
}
