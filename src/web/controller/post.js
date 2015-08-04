import base from './base';


export default class extends base {

  init(http) {
    super.init(http);

    this.modelInstance = this.model('post');
  }
  /**
   * home page
   * @return {} []
   */
  indexAction(http){
    let pathname = http.pathname || '';
    let [, param] = pathname.match(/post\/(.*?)(?:\?.*)?$/) || [];
    return param ? this.itemAction(param) : this.listAction();
  }

  async listAction() {
    let self = this;

    let page = Number.parseInt(this.get('page')) || 1;
    let count = await this.modelInstance.count('id');
    let paginator = this.getPaginator(count, page, 10);
    let list = await this.modelInstance.limit(paginator.start, paginator.itemsPerPage).select();

    await self.implementPosts(list);

    this.assign('list', list);
    this.assign('paginator', paginator);

    return this.display('list');
  }

  async itemAction(param) {

    let where = {id: param};
    let post =  await this.modelInstance.where(where).find();

    await this.implementPosts(post);

    this.assign('post', post);

    return this.display('item');
  }

  __call(action) {
    return this.indexAction(action.http);
  }
}