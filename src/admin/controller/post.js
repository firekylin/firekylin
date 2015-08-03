import moment from 'moment';

import base from './apiBase';


export default class extends base {

  async postAction() {
    let data = this.post();
    if(think.isEmpty(data)){
      return this.fail('data is empty');
    }

    let category = data.category;
    if (data.newCategory) {
      let categoryModel = this.model('category');
      category = categoryModel.add({name: data.newCategory});
    }

    let date = moment().format();
    let author = 0;

    let insertId = await this.modelInstance.add({
      category,
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
      modify_user: 0
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