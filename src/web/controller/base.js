import moment from 'moment';

export default class extends think.controller.base {

  init(http) {
    super.init(http);

    this.assign('site', {});
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
      }
    })
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
        url: '/post/' + post.id,
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

}