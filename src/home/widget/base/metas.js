const Widget = require('../../../common/widget/base');

module.exports = class MetasWidget extends Widget {
  get metaType() {
    return '';
  }

  get title() {
    return this.fieldAccessor('name');
  }

  get theId() {
    return `${this.metaType}-${this.row.id}`;
  }

  get permalink() {
    return `/${this.metaType}/${this.row.pathname}`;
  }

  get url() {
    return this.permalink;
  }
};
