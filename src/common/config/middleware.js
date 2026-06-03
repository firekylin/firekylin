const fs = require('fs');
const path = require('path');
const routerREST = require('think-router-rest');

const isDev = think.env === 'development';
const isCli = think.env === 'cli';
const packageRoot = process.env.FK_PACKAGE_ROOT || think.ROOT_PATH;
const resourceRoot = isCli ? think.ROOT_PATH : path.join(think.ROOT_PATH, 'www');
const packageResourceRoot = path.join(packageRoot, 'www');

const middlewares = [
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
      root: resourceRoot,
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

        const themeErrorFilePath = path.join(think.RESOURCE_PATH, 'theme', theme, 'error');
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

if (isCli) {
  middlewares.splice(1, 0, {
    handle: 'resource',
    options: {
      root: packageResourceRoot,
      publicPath: /^\/static\/dist\//
    }
  });
}

module.exports = middlewares;
