import moment from 'moment';
import marked from 'marked';
import highlight from 'highlight.js';

export default class extends think.controller.base {

  async __before() {

    await this.loadConfig();

    this.assign('site', this.siteConfig);
    this.assign('page', {});
    this.assign('root_url', '');
    this.assign('filters', {
      truncate(string, length = 100, ellipsis = '...') {
        return String(string).length > length ?
        string.substr(0, length - ellipsis.length) + ellipsis :
            string;
      },
      formatDate(date, format = 'YYYY-MM-DD') {
        return moment(date).format(format);
      },
      excerpt(string, ellipsis) {
        return this.truncate(string, 200, ellipsis);
      },
      parseCode(string, object = {}) {
        return string.replace(/\$\$(\w+)\$\$/g, (_, key) => object[key] || '');
      },
      markdown(str, parseCode = true) {
        marked.setOptions({
          highlight(code, lang) {
            if (!parseCode || !lang) {
              return code;
            }
            lang = lang.toLowerCase();
            if (highlight.getLanguage(lang)){
              return highlight.highlight(lang, code).value;
            } else {
              highlight.highlightAuto(code)
              return highlight.highlightAuto(code).value;
            }
          }
        });
        return marked(str).replace(/(class="lang-([^"]+)")/g, '$1 lang="$2"');
      },
      flatHTML(string) {
        return string.replace(/<.+?>/g, '');
      }
    });
  }

  async loadConfig() {
    let items = await this.model('config').select();
    let siteConfig = {};

    items.forEach(item => {
      let value = item.value;
      if (value == 'false' || value == 'true') {
        value = value == 'true';
      } else if (parseFloat(value) == value) {
        value = parseFloat(value)
      }
      siteConfig[item.key] = value
    });

    this.siteConfig = siteConfig;
  }

  getPaginator(totalCount, currentPage = 1, itemsPerPage = 10) {
    return {
      start: (currentPage - 1) * itemsPerPage,
      itemsPerPage,
      previous_page : currentPage > 1 ? currentPage - 1 : false,
      next_page : currentPage * itemsPerPage < totalCount ? currentPage + 1 : false
    }

  }

  async getCategoryMap(forceUpdate) {
    if (!this.categoryMap || forceUpdate) {
      let map = {};
      let list = await this.model('category').select();

      list.forEach(category => {
        map[category.id] = category;
      });
      this.categoryMap = map;
    }
    return this.categoryMap;
  }

  async implementPosts(post) {
    let self = this;
    let categoryMap = await this.getCategoryMap();
    let categories = [];

    if (Array.isArray(post)) {
      return await post.map(async post => await self.implementPosts(post));
    } else {
      String(post.category_id).split(',').forEach(async cid => {
        let category = categoryMap[cid];
        if (!category) {
          categoryMap =  await this.getCategoryMap(true);
          category = categoryMap[cid];
        }
        categories.push(category);
      });

      return Object.assign(post, {
        url: 'post/' + post.id,
        categories: categories
      });
    }
  }

  gatherPost(list) {
    let dateMap = {};

    list.forEach(post => {
      let key = moment(post.date).format('YYYY-MM');
      if (!dateMap[key]) {
        dateMap[key] = {
          date: moment(post.date).startOf('month'),
          list: []
        }
      }

      dateMap[key].list.push(post);
    });

    return Object.keys(dateMap).map(key => dateMap[key]);
  }

  _404Action() {
    this.status(404); //发送404状态码
    this.end('not found');
  }

}