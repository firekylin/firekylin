import moment from 'moment';

import base from './apiBase';


export default class extends base {

  async getAction(){
    let data;

    if (this.id) {
      data = await this.modelInstance.where({id: this.id}).find();
      data.category = await this.model('category').where({id: data.category_id}).getField('id', true);
    } else {
      let page = this.get('page') || 1;
      let pageCount = this.get('page_count') || 20;

      data = await this.modelInstance
          .alias('post')
          .field('`post`.*, `category`.`name` as "category", `user`.`username` as "user"')
          .join([{
            table: 'category',
            as: 'category',
            on: ['`post`.`category_id`', '`category`.`id`']
          }, {
            table: 'user',
            as: 'user',
            on: ['`post`.`user_id`', '`user`.`id`']
          }])
          .order('`date` DESC')
          .limit((page - 1) * pageCount, pageCount)
          .select();
    }

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
      modify_user_id: author
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
      modify_user_id: this.userInfo.id,
      category_id: data.category
    });
    delete data.category;

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