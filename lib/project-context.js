'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = 'firekylin.config.js';

function findProjectPath(start = process.cwd()) {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, CONFIG_FILE))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function loadProject(projectPath) {
  const configPath = path.join(projectPath, CONFIG_FILE);
  delete require.cache[require.resolve(configPath)];
  const config = require(configPath); // eslint-disable-line import/no-dynamic-require
  if (!config || !config.database || !config.database.type) {
    throw new Error(`${CONFIG_FILE} 缺少 database.type`);
  }
  return config;
}

function getContext() {
  const packagePath = path.resolve(__dirname, '..');
  const projectPath = process.env.FIREKYLIN_PROJECT_PATH;
  const legacy = !projectPath;
  const base = legacy ? packagePath : path.resolve(projectPath);
  const dataPath = legacy ? packagePath : path.join(base, 'data');
  return {
    legacy,
    packagePath,
    projectPath: base,
    dataPath,
    runtimePath: legacy ? path.join(packagePath, 'runtime') : path.join(dataPath, 'runtime'),
    logsPath: legacy ? path.join(packagePath, 'logs') : path.join(dataPath, 'logs'),
    themesPath: legacy ? path.join(packagePath, 'www', 'theme') : path.join(base, 'themes'),
    uploadPath: legacy ? path.join(packagePath, 'www', 'static', 'upload') : path.join(base, 'uploads'),
    config: legacy ? null : loadProject(base)
  };
}

module.exports = {CONFIG_FILE, findProjectPath, getContext, loadProject};
