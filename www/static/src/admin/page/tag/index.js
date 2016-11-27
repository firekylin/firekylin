module.exports = {
  path: 'tag',
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