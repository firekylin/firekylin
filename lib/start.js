'use strict';

const fs = require('fs');
const path = require('path');
const Application = require('thinkjs');
const {findProjectPath, getContext} = require('./project-context');

function start({development = false, legacy = false} = {}) {
  if (!legacy) {
    const projectPath = findProjectPath();
    if (!projectPath) throw new Error('当前目录及其父目录中未找到 firekylin.config.js');
    process.env.FIREKYLIN_PROJECT_PATH = projectPath;
    const context = getContext();
    if (!fs.existsSync(context.installedPath)) {
      throw new Error('该 Firekylin 项目尚未完成初始化，请重新运行 firekylin new <folder>');
    }
    fs.mkdirSync(context.runtimePath, {recursive: true});
    fs.mkdirSync(context.logsPath, {recursive: true});
  }

  const packagePath = path.resolve(__dirname, '..');
  const context = getContext();
  const server = (context.config && context.config.server) || {};
  const options = {
    ROOT_PATH: packagePath,
    APP_PATH: path.join(packagePath, 'src'),
    RUNTIME_PATH: context.runtimePath,
    proxy: development ? false : server.proxy !== false,
    env: development ? 'development' : 'production'
  };
  if (development) options.watcher = require('think-watcher');
  const instance = new Application(options);
  return instance.run();
}

module.exports = start;
