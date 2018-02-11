import auth from 'common/util/auth';

module.exports = {
  path: 'push',
  onEnter(nextState, replace) {
    return auth(replace);
  },
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
