const Base = require('./base');

module.exports = class extends Base {
  /**
   * get
   * @return {[type]} [description]
   */
  async getAction() {
    let result;
    if(this.id) {
      result = await this.modelInstance.where({id: this.id}).find();
      result.post_tag = result.post_tag.length;
    } else {
      result = await this.modelInstance.select();
      result = result.map(item => {
        item.post_tag = item.post_tag.length;
        return item;
      });
    }
    return this.success(result);
  }
  /**
   * add user
   * @return {[type]} [description]
   */
  async postAction() {
    let data = this.post();

    let ret = await this.modelInstance.addTag(data);
    if(ret.type === 'exist') {
      return this.fail('TAG_EXIST');
    }
    return this.success({id: ret.id});
  }
  /**
   * update user info
   * @return {[type]} [description]
   */
  async putAction() {
    if (!this.id) {
      return this.fail('PARAMS_ERROR');
    }
    let data = this.post();
    data.id = this.id;
    let rows = await this.modelInstance.saveTag(data);
    return this.success({affectedRows: rows});
  }

  async deleteAction() {
    if(!this.id) {
      return this.fail('PARAMS_ERROR');
    }
    await this.modelInstance.deleteTag(this.id);
    return this.success();
  }
}
