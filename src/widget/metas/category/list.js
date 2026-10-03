const MetasWidget = require('../../base/metas');

module.exports = class extends MetasWidget {
  get metaType() {
    return 'cate';
  }

  async execute() {
    this.pushAll(await this.model('cate').getCateList());
  }
};
