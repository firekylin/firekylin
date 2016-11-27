module.exports = {
  path: 'cate',
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