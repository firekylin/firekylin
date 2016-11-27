module.exports = {
  path: 'appearance',
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
      require('./theme'),
      require('./navigation')
    ]);
  }
}