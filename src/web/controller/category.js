import moment from 'moment';

import base from './base';


export default class extends base {

  init(http) {
    super.init(http);
    this.modelInstance = this.model('category');
  }

  async indexAction(http){

    let pathname = http.pathname || '';
    let [, param] = pathname.match(/category\/(.*?)(?:\?.*)?$/) || [];
    return param ? this.itemAction(param) : this.listAction();
  }

  async listAction() {

    let categories = await this.modelInstance.order('id').select();
    let count = await this.model('post')
        .field(['`category_id` as id', 'count(`category_id`) as count'])
        .where({status: 1})
        .group('category_id')
        .order('id').select();
    let countIndex = 0;
    categories.forEach(category => {
      let countItem = count[countIndex];
      if (countItem && category.id == countItem.id) {
        category.count = countItem.count;
        countIndex ++;
      } else {
        category.count = 0;
      }
    });

    categories.sort((a, b) => b.count - a.count);

    this.assign('list', categories);
    return this.display('list');
  }

  async itemAction(param) {
    let where = isNaN(param) ?
      { name: decodeURIComponent(param) } :
      { id: param, name: param, _logic: 'OR'} ;

    let category = await this.modelInstance.where(where).find();
    let postList = await this.model('post').where({category_id: category.id}).order('`date` DESC').select();

    await this.implementPosts(postList);

    this.assign('category', category);
    this.assign('list', this.gatherPost(postList));

    this.display('item');
  }

  __call(action) {
    return this.indexAction(action.http);
  }

}