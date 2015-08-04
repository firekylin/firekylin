import base from './apiBase'

export default class extends base {

  async getAction(){
    let categories;
    let postModel = this.model('post');
    if (this.id) {
      categories = await this.modelInstance.where({id: this.id}).find();
      categories.count = await postModel.where({category_id: this.id}).count('*');
    } else {
      categories = await this.modelInstance.order('id').select();
      let count = await postModel.field(['`category_id` as id', 'count(`category_id`) as count']).group('category_id').order('id').select();
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
    }

    return this.success(categories);
  }

  async postAction(){
    let data = this.post();
    if(think.isEmpty(data)){
      return this.fail('data is empty');
    }
    delete data.id;

    let result = await this.modelInstance.where({name: data.name}).count();
    if (result) {
      return this.fail('分类名已经存在');
    }

    let insertId = await this.modelInstance.add(data);
    return this.success({id: insertId});
  }

  async deleteAction(){
    if (!this.id) {
      return this.fail('params error');
    }
    let postModel = this.model('post');
    let rows = await this.modelInstance.where({id: this.id}).delete();
    await postModel.where({category: this.id}).update({category: 0});
    return this.success({affectedRows: rows});
  }

}