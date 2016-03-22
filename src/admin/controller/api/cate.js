'use strict';

import Base from './base.js';

export default class extends Base {
  /**
   * get
   * @return {[type]} [description]
   */
  getAction(self){
    //this.modelInstance.setRelation(false);
    if(this.get('pid')) {
      this.modelInstance.where({pid: this.get('pid')});
    }
    return super.getAction(self);
  }

  /**
   * add user
   * @return {[type]} [description]
   */
  async postAction(){
    let data = this.post();

    let ret = await this.modelInstance.addCate(data);
    if(ret.type === 'exist'){
      return this.fail('CATE_EXIST');
    }
    return this.success({id: ret.id});
  }
  /**
   * update user info
   * @return {[type]} [description]
   */
  async putAction(){
    if (!this.id) {
      return this.fail('PARAMS_ERROR');
    }
    let data = this.post();
    data.id = this.id;
    let rows = await this.modelInstance.saveCate(data);
    return this.success({affectedRows: rows});
  }
}
