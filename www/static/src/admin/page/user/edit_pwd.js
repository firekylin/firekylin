module.exports = {
  path: 'edit_pwd',
  getComponent(nextState, callback) {
    callback(null, require('../../component/user_editpwd'));
  }
}
