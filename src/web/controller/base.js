import moment from 'moment';

import filters from '../utiles/filters';


export default class extends think.controller.base {

  async __before() {

    await this.loadConfig();

    this.assign('site', this.siteConfig);
    this.assign('page', {});
    this.assign('root_url', '');
    this.assign('filters', filters);
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

  /*async getTagMap(forceUpdate) {
    if (!this.tagMap || forceUpdate) {
      let map = {};
      let list = await this.model('tag').select();

      list.forEach(tag => {
        map[tag.id] = tag;
      });
      this.tagMap = map;
    }
    return this.tagMap;
  }

  async getTagsByPostID(pid) {
    let postTag = await this.model('post_tag').where({post_id: pid}).select();
    return postTag;
  }*/

  async setInitTagMap(pids, forceUpdate) {
    if (!this.tagMap || forceUpdate){
      let map = {};
      let tags = await this.model('post_tag')
        .join({
          table : "tag",
          join : "inner",
          on : ["tag_id", "id"]
        })
        .where({'post_id' : ['IN', pids]})
        .field('post_id,tag_id,name')
        .select();

      tags.forEach(details =>{
        if(map[details.post_id]){
          map[details.post_id].push({
            id : details.tag_id,
            name : details.name
          });
        } else {
          map[details.post_id] = [{
            id : details.tag_id,
            name : details.name
          }];
        }
      });

      this.tagMap = map;
    }

    return this.tagMap;
  }

  async implementPosts(post) {
    let categoryMap = await this.getCategoryMap();
    let categories = [];
    let tags = [];

    if (Array.isArray(post)) {
      let pids = post.map(post => {
        return post.id;
      });
      this.tagMap = await this.setInitTagMap(pids);
      return await post.map(async post => await this.implementPosts(post));
    } else {
      String(post.category_id).split(',').forEach(async cid => {
        let category = categoryMap[cid];
        if (!category) {
          categoryMap =  await this.getCategoryMap(true);
          category = categoryMap[cid];
        }
        categories.push(category);
      });

      if(think.isEmpty(this.tagMap)) {
        this.tagMap = await this.setInitTagMap(post.id);
      }

      tags = this.tagMap[post.id];

      return Object.assign(post, {
        url: 'post/' + post.id,
        categories: categories,
        tags: tags
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