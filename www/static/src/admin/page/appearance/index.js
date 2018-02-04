import auth from 'common/util/auth';

module.exports = {
  path: 'appearance',
  onEnter(nextState, replace) {
    return auth(replace);
  },
  indexRoute: {
    onEnter(nextState, replace) {
      return replace({pathname: '/appearance/theme'});
    }
  },
  getComponent(nextState, callback) {
    callback(null, require('../../component/appearance'));
  },
  getChildRoutes(nextState, callback) {
    callback(null, [
      require('./edit'),
      require('./theme'),
      require('./navigation')
    ]);
  }
}
