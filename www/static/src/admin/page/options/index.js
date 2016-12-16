module.exports = {
  path: 'options',
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
      require('./import')
    ]);
  }
}