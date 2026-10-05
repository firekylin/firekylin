const os = require('os');
const path = require('path');
const Application = require('thinkjs');
const Loader = require('thinkjs/lib/loader');
const {findProjectPath} = require('./lib/project-context');

const projectPath = findProjectPath();
if (!projectPath) throw new Error('当前目录及其父目录中未找到 firekylin.config.js');
process.env.FIREKYLIN_PROJECT_PATH = projectPath;

const app = new Application({
  ROOT_PATH: __dirname,
  APP_PATH: path.join(__dirname, 'src'),
  VIEW_PATH: path.join(__dirname, 'view'),
  RUNTIME_PATH: os.tmpdir(),
  proxy: true, // use proxy
  env: 'vercel',
  external: {
    package: path.join(__dirname, 'package.json'),
    qiniu: path.join(__dirname, 'node_modules/qiniu/qiniu'),
    static: {
      www: path.join(__dirname, 'www')
    }
  }
});

const loader = new Loader(app.options);
loader.loadAll('worker');

const ready = think.beforeStartServer().catch(err => {
  think.logger.error(err);
}).then(() => {
  think.app.emit('appReady');
});

module.exports = function(req, res) {
  return ready.then(() => {
    const callback = think.app.callback();
    return callback(req, res);
  });
};
