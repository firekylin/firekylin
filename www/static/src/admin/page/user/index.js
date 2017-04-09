import auth from 'common/util/auth';

module.exports = {
  path: 'user',
  onEnter(nextState, replace) {
    let {pathname} = nextState.location;
    if(pathname !== '/user/edit_pwd') {
      return auth(replace);
    } else return true;
  },
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
