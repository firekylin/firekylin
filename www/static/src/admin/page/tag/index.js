import auth from 'common/util/auth';

module.exports = {
  path: 'tag',
  onEnter(nextState, replace) {
    return auth(replace);
  },
  getComponent(nextState, callback) {
    callback(null, require('../../component/tag'));
  },
  indexRoute: {
    onEnter(nextState, replace) {
      return replace({pathname: '/tag/list'});
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
