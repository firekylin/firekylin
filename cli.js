const path = require('path');
const Application = require('thinkjs');

module.exports = options => {
  if (options.host) {
    process.env.HOST = options.host;
  }
  if (options.port) {
    process.env.PORT = options.port;
  }

  const packageRoot = __dirname;
  process.env.FK_PACKAGE_ROOT = packageRoot;
  // Avoid ThinkJS interpreting `firekylin server ...` args as CLI action route.
  process.argv = process.argv.slice(0, 2);

  const instance = new Application({
    ROOT_PATH: process.cwd(),
    APP_PATH: path.join(packageRoot, 'src'),
    proxy: true,
    env: 'cli'
  });

  instance.run();
};
