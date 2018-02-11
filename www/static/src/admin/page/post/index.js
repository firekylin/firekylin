module.exports = {
  path: 'post',
  getComponent(nextState, callback) {
    callback(null, require('../../component/post'));
  },
  indexRoute: {
    onEnter(nextState, replace) {
      return replace({pathname: '/post/list'});
    }
  },
  getChildRoutes(nextState, callback) {
    require.ensure([], function(require) {
      callback(null, [
        require('./list'),
        require('./edit'),
        require('./create')
      ])
    }, 'post');
  }
}
