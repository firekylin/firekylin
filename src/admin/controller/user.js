import moment from 'moment';

import base from './apiBase';


export default class extends base {
  
  async getAction(){
    
  }

  async postAction() {
    
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