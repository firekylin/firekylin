import auth from 'common/util/auth';

module.exports = {
  path: 'options',
  onEnter(nextState, replace) {
    return auth(replace);
  },
  getComponent(nextState, callback) {
    callback(null, require('admin/component/options'));
  },
  indexRoute: {
    onEnter(nextState, replace) {
      return replace({pathname: '/options/general'});
    }
  },
  getChildRoutes(nextState, callback) {
    callback(null, [
      require('./general'),
      require('./reading'),
      require('./two_factor_auth'),
      require('./comment'),
      require('./upload'),
      require('./analytic'),
      require('./push'),
      require('./import'),
      require('./export')
    ]);
  }
}
