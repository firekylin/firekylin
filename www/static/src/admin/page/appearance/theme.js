module.exports = {
  path: 'theme',
  getComponent(nextState, callback) {
    require.ensure([], function(require) {
      callback(null, require('../../component/theme'));
    }, 'theme');
  }
};


