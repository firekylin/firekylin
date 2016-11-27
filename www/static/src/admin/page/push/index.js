module.exports = {
  path: 'push',
  getComponent(nextState, callback) {
    callback(null, require('../../component/push'));
  },
  indexRoute: {
    onEnter(nextState, replace) {
      return replace({pathname: '/push/list'});
    }
  },
  getChildRoutes(nextState, callback) {
    callback(null, [
      require('./list'),
      require('./edit'),
      require('./create')
    ]);
  }
}