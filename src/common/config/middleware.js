const path = require('path');
const routerREST = require('think-router-rest');
const isDev = think.env === 'development';

module.exports = [
  {
    handle: 'meta',
    options: {
      logRequest: isDev,
      sendResponseTime: isDev
    }
  },
  {
    handle: 'resource',
    // enable: isDev,
    options: {
      root: path.join(think.ROOT_PATH, 'www'),
      publicPath: /^\/(static\/|theme\/|[^\/]+\.(?!js|html|xml)\w+$)/
    }
  },
  {
    handle: 'trace',
    enable: !think.isCli,
    options: {
      debug: isDev
    }
  },
  {
    handle: 'payload',
    options: {}
  },
  {
    handle: 'router',
    options: {}
  },
  {
    handle: routerREST
  },
  'logic',
  {
    handle: 'controller',
    options: {
      emptyController: 'base'
    }
  }
];
