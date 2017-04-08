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
      }
    }
  }
};
