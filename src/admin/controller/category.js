import base from './apiBase'

export default class extends base {

  async getAction(){
    let data;
    let postModel = this.model('post');
    if (this.id) {
      data = await this.modelInstance.where({id: this.id}).find();
      data.count = await postModel.where({category: this.id}).count('*');
    } else {
      data = await this.modelInstance.order('id').select();
      let count = await postModel.field(['`category` as id', 'count(`category`) as count']).group('category').order('id').select();
      let countIndex = 0;
      data.forEach(category => {
        let countItem = count[countIndex];
        if (countItem && category.id == countItem.id) {
          category.count = countItem.count;
          countIndex ++;
        } else {
          category.count = 0;
        }
      });
    }

    return this.success(data);
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