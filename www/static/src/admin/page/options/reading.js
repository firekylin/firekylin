module.exports = {
  path: 'reading',
  getComponent(nextState, callback) {
    callback(null, require('../../component/options_reading'));
  }
}
