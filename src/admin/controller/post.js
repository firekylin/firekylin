import moment from 'moment';

import base from './apiBase';


export default class extends base {

  async getAction(){
    let data;
    if (this.id) {
      data = await this.modelInstance.where({id: this.id}).find();
      return this.success(data);
    }
    data = await this.modelInstance.order('`date` DESC').select();
    return this.success(data);
  }

  async postAction() {
    let data = this.post();
    if(think.isEmpty(data)){
      return this.fail('data is empty');
    }

    let category_id = data.category;
    if (data.newCategory) {
      let categoryModel = this.model('category');
      category_id = categoryModel.add({name: data.newCategory});
    }

    let date = moment().format();
    let author = this.userInfo.id;

    let insertId = await this.modelInstance.add({
      category_id,
      date,
      author,
      title: data.title,
      content: data.content,
      modify_date: date,
      modify_user: author
    });

    return this.success({id: insertId});
  }

  async putAction() {
    if (!this.id) {
      return this.fail('params error');
    }
    let data = this.post();
    if (think.isEmpty(data)) {
      return this.fail('data is empty');
    }
    delete data.id;

    Object.assign(data, {
      modify_date: moment().format(),
      modify_user: this.userInfo.id
    });
    let rows = await this.modelInstance.where({id: this.id}).update(data);
    return this.success({affectedRows: rows});
  }

  async deleteAction() {
    if (!this.id) {
      return this.fail('params error');
    }
    let ids = this.id.toString().split(',');
    let rows = await this.modelInstance.where({id: ['in', ids]}).delete();
    return this.success({affectedRows: rows});
  }
}