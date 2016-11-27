module.exports = {
  path: 'page',
  getComponent(nextState, callback) {
    callback(null, require('../../component/page'));
  },
  indexRoute: {
    onEnter(nextState, replace) {
      return replace({pathname: '/page/list'});
    }
  },
  getChildRoutes(nextState, callback) {
    require.ensure([], function(require) {
      callback(null, [
        require('./list'),
        require('./edit'),
        require('./create')
      ])
    }, 'page');
  }
}