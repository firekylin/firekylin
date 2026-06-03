const url = require('url');
const path = require('path');
const fs = require('fs');
const nunjucks = require('think-view-nunjucks');

const buildQuery = obj => '?' +
Object.keys(obj).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])).join('&');
const packageRoot = process.env.FK_PACKAGE_ROOT || think.ROOT_PATH;

/**
 * view adapter config
 * @type {Object}
 */
module.exports = {
  type: 'nunjucks',
  common: {
    viewPath: path.join(packageRoot, 'view'),
    sep: '_',
    extname: '.html',
    content_type: 'text/html'
  },
  nunjucks: {
    handle: nunjucks,
    beforeRender(env, nunjucks) {
      env.addGlobal('think', think);
      env.addGlobal('JSON', JSON);
      env.addGlobal('eval', eval);

      // 读取 Vite manifest，注入资源路径映射
      const manifestPath = path.join(packageRoot, 'www/static/dist/.vite/manifest.json');
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        env.addGlobal('vite', manifest);
      } catch (e) {
        env.addGlobal('vite', {});
      }

      env.addFilter('utc', time => (new Date(time)).toUTCString());
      env.addFilter('pagination', function(page, pageUrl) {
        const {pathname, query} = url.parse(pageUrl, true);

        query.page = page;
        return pathname + buildQuery(query);
      });
      env.addFilter('xml', str => {
        // eslint-disable-next-line no-control-regex
        const NOT_SAFE_IN_XML = /[^\x09\x0A\x0D\x20-\xFF\x85\xA0-\uD7FF\uE000-\uFDCF\uFDE0-\uFFFD]/gm;
        return str.replace(NOT_SAFE_IN_XML, '');
      });
    }
  }
};
