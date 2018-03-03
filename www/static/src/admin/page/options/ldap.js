module.exports = {
  path: 'ldap',
  getComponent(nextState, callback) {
    callback(null, require('../../component/options_ldap'));
  }
}
