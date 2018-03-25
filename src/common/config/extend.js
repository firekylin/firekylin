const path = require('path');
const view = require('think-view');
const model = require('think-model');
const cache = require('think-cache');
const session = require('think-session');

module.exports = [
  view, // make application support view
  model(think.app),
  cache,
  session,
  {
    think: {
      TMPDIR_PATH: path.join(think.ROOT_PATH, 'runtime', 'tmp'),
      RUNTIME_PATH: path.join(think.ROOT_PATH, 'runtime'),
      RESOURCE_PATH: path.join(think.ROOT_PATH, 'www'),
      UPLOAD_PATH: path.join(think.ROOT_PATH, 'www', 'static/upload'),
      UPLOAD_BASE_URL: ''
    }
  }
];
