import auth from 'common/util/auth';

module.exports = {
  path: 'cate',
  onEnter(nextState, replace) {
    return auth(replace);
  },
  getComponent(nextState, callback) {
    callback(null, require('../../component/cate'));
  },
  indexRoute: {
    onEnter(nextState, replace) {
      return replace({pathname: '/cate/list'});
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
