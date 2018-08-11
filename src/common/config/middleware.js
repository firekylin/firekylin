const fs = require('fs');
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
        const APIRequest = /^\/admin\/api/.test(ctx.request.path);
        const AJAXRequest = ctx.is('X-Requested-With', 'XMLHttpRequest');

        return APIRequest || AJAXRequest ? 'json' : 'html';
      },
      error(err) {
        if (think.isPrevent(err)) {
          return false;
        }
        console.error(err);
      },
      async templates() {
        const optionsModel = new think.model('options');
        const { theme } = await optionsModel.getOptions();

        let themeErrorFilePath = path.join(think.RESOURCE_PATH, 'theme', theme, 'error');
        try {
          fs.statSync(themeErrorFilePath);
        } catch (e) {
          console.log(e); // eslint-disable-line no-console
        }
        return themeErrorFilePath;
      }
    }
  },
  {
    handle: 'payload',
    options: {
      uploadDir: think.TMPDIR_PATH
    }
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
