const path = require('path');
const Application = require('thinkjs');

const instance = new Application({
  ROOT_PATH: __dirname,
  APP_PATH: path.join(__dirname, 'src'),
  RUNTIME_PATH: path.join(process.cwd(), 'runtime'),
  proxy: true, // use proxy
  env: 'pkg'
});

instance.run();
