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
      publicPath: /^\/(static\/|theme\/|[^/]+\.(?!js|html|xml)\w+$)/
    }
  },
  {
    handle: 'trace',
    enable: !think.isCli,
    options: {
      debug: isDev,
      contentType(ctx) {
        // All request url starts of /api or
        // request header contains `X-Requested-With: XMLHttpRequest` will output json error
        if (!isDev) {
          return 'json';
        }

        const APIRequest = /^\/admin\/api/.test(ctx.request.path);
        const AJAXRequest = ctx.is('X-Requested-With', 'XMLHttpRequest');

        return APIRequest || AJAXRequest ? 'json' : 'html';
      },
      error(err) {
        if (think.isPrevent(err)) {
          return false;
        }
        console.error(err);
      }
    }
  },
  {
    handle: 'payload',
    options: {}
  },
  {
    handle: 'router',
    options: {
      prefix: ['/']
    }
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
