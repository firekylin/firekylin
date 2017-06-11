'use strict';

import {parse} from 'url';

const build_query = obj => '?' +
  Object.keys(obj).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])).join('&');
/**
 * template config
 */
export default {
  type: 'nunjucks',
  content_type: 'text/html',
  file_ext: '.html',
  file_depr: '_',
  root_path: think.ROOT_PATH + '/view',
  adapter: {
    nunjucks: {
      prerender: function(nunjucks, env) {
        env.addFilter('utc', time => (new Date(time)).toUTCString());
        env.addFilter('pagination', function(page) {
          let {pathname, query} = parse(this.ctx.http.url, true);

          query.page = page;
          return pathname + build_query(query);
        });
        env.addFilter('xml', str=> {
          let NOT_SAFE_IN_XML = /[^\x09\x0A\x0D\x20-\xFF\x85\xA0-\uD7FF\uE000-\uFDCF\uFDE0-\uFFFD]/gm;
          return str.replace(NOT_SAFE_IN_XML, '');
        })
      }
    }
  }
};
