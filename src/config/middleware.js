const fs = require('fs');
const path = require('path');
const routerREST = require('think-router-rest');

const isDev = think.env === 'development';
const isVercel = think.env === 'vercel';
const traceOptions = {
  debug: isDev,
  contentType(ctx) {
    if (isVercel) return 'json';

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
  }
};

if (!isVercel) {
  traceOptions.templates = async() => {
    const optionsModel = new think.model('options');
    const {theme} = await optionsModel.getOptions();

    const themeErrorFilePath = path.join(think.THEMES_PATH, theme, 'error');
    try {
      fs.statSync(themeErrorFilePath);
    } catch (e) {
      console.log(e); // eslint-disable-line no-console
    }
    return themeErrorFilePath;
  };
}

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
  ...(process.env.FIREKYLIN_PROJECT_PATH ? [{
    handle: 'resource',
    options: {
      root: process.env.FIREKYLIN_PROJECT_PATH,
      publicPath: /^\/(uploads\/|themes\/)/
    }
  }] : []),
  {
    handle: 'trace',
    enable: !think.isCli,
    options: traceOptions
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
