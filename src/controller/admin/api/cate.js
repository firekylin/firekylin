const Base = require('./base');

module.exports = class extends Base {
  async getAction() {
    let result;
    const pid = this.get('pid');
    const withPostCount = item => {
      item.post_cate = item.post_cate.length;
      return item;
    };
    if (pid) {
      // 之前这一分支没有接收查询结果，pid 过滤被静默丢弃。
      result = await this.modelInstance.where({ pid }).select();
      result = result.map(withPostCount);
    } else if (this.id) {
      result = await this.modelInstance.where({ id: this.id }).find();
      result = withPostCount(result);
    } else {
      result = await this.modelInstance.select();
      result = result.map(withPostCount);
    }
    return this.success(result);
  }

  async postAction() {
    const data = this.post();

    const ret = await this.modelInstance.addCate(data);
    if (ret.type === 'exist') {
      return this.fail('CATE_EXIST');
    }
    return this.success({ id: ret.id });
  }

  async putAction() {
    if (!this.id) {
      return this.fail('PARAMS_ERROR');
    }
    const data = this.post();
    data.id = this.id;
    // data.id 来自 URL（字符串），data.pid 来自表单，两者需要统一成数字再比较，
    // 否则严格相等永远为 false，自引用父级的校验形同虚设。
    if (data.pid !== undefined && data.pid !== null && data.pid !== '' &&
      Number(data.id) === Number(data.pid)) {
      return this.fail('CATE_PARENT_ERROR');
    }
    const rows = await this.modelInstance.saveCate(data);
    return this.success({ affectedRows: rows });
  }

  async deleteAction() {
    if (!this.id) {
      return this.fail('PARAMS_ERROR');
    }
    await this.modelInstance.deleteCate(this.id);
    return this.success();
  }
};
