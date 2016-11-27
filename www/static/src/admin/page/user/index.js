module.exports = {
  path: 'user',
  getComponent(nextState, callback) {
    callback(null, require('../../component/user'));
  },
  indexRoute: {
    onEnter(nextState, replace) {
      return replace({pathname: '/user/list'});
    }
  },
  getChildRoutes(nextState, callback) {
    callback(null, [
      require('./list'),
      require('./edit'),
      require('./create'),
      require('./edit_pwd')
    ]);
  }
}