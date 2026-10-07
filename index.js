const os = require('node:os');
const path = require('node:path');
const Application = require('thinkjs');
const Loader = require('thinkjs/lib/loader');
const {findProjectPath} = require('./lib/project-context');

module.exports = function main() {
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

  return function (req, res) {
    return think
      .beforeStartServer()
      .catch((err) => {
        think.logger.error(err);
      })
      .then(() => {
        const callback = think.app.callback();
        return callback(req, res);
      })
      .then(() => {
        think.app.emit('appReady');
      });
  };
};