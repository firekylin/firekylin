const path = require('path');
const Application = require('thinkjs');
const Loader = require('thinkjs/lib/loader');

class NowLoader extends Loader {
  writeConfig() { }
}

const app = new Application({
  ROOT_PATH: __dirname,
  APP_PATH: path.join(__dirname, 'src'),
  VIEW_PATH: path.join(__dirname, 'view'),
  proxy: true, // use proxy
  env: 'now',
  external: {
    package: path.join(__dirname, 'package.json'),
    qiniu: path.join(__dirname, 'node_modules/qiniu/qiniu'),
    static: {
      www: path.join(__dirname, 'www')
    }
  }
});

const loader = new NowLoader(app.options);
loader.loadAll('worker');
module.exports = function (req, res) {
  return think.beforeStartServer().catch(err => {
    think.logger.error(err);
  }).then(() => {
    const callback = think.app.callback();
    return callback(req, res);
  })
.then(() => {
    think.app.emit('appReady');
  });
};
