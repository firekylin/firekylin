const os = require('os');
const path = require('path');
const view = require('think-view');
const model = require('think-model');
const cache = require('think-cache');
const session = require('think-session');
const {getContext} = require('../../lib/project-context');

const context = getContext();
const ROOT_PATH = think.env === 'vercel' ? os.tmpdir() : context.runtimePath;
module.exports = [
  view, // make application support view
  model(think.app),
  cache,
  session,
  {
    think: {
      TMPDIR_PATH: path.join(ROOT_PATH, 'tmp'),
      RUNTIME_PATH: ROOT_PATH,
      RESOURCE_PATH: path.join(think.ROOT_PATH, 'www'),
      PACKAGE_RESOURCE_PATH: path.join(think.ROOT_PATH, 'www'),
      THEMES_PATH: context.themesPath,
      UPLOAD_PATH: context.uploadPath,
      UPLOAD_BASE_URL: context.legacy ? '' : '/uploads/'
    }
  }
];
