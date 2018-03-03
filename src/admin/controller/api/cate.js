const Base = require('./base');

module.exports = class extends Base {
  async getAction() {
    let result;
    if(this.get('pid')) {
      this.modelInstance.where({pid: this.get('pid')});
    }
    if(this.id) {
      result = await this.modelInstance.where({id: this.id}).find();
      result.post_cate = result.post_cate.length;
    } else {
      result = await this.modelInstance.select();
      result = result.map(item => {
        item.post_cate = item.post_cate.length;
        return item;
      });
    }
    return this.success(result);
  }

  async postAction() {
    let data = this.post();

    let ret = await this.modelInstance.addCate(data);
    if(ret.type === 'exist') {
      return this.fail('CATE_EXIST');
    }
    return this.success({id: ret.id});
  }

  async putAction() {
    if (!this.id) {
      return this.fail('PARAMS_ERROR');
    }
    let data = this.post();
    data.id = this.id;
    let rows = await this.modelInstance.saveCate(data);
    return this.success({affectedRows: rows});
  }

  async deleteAction() {
    if(!this.id) {
      return this.fail('PARAMS_ERROR');
    }
    await this.modelInstance.deleteCate(this.id);
    return this.success();
  }
}
