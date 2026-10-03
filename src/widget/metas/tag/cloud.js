const MetasWidget = require('../../base/metas');

module.exports = class extends MetasWidget {
  get metaType() {
    return 'tag';
  }

  async execute() {
    const sort = ['name', 'pathname', 'count', 'update_time'].includes(this.parameter.sort)
      ? this.parameter.sort
      : 'count';
    const desc = typeof this.parameter.desc === 'undefined' ? true : Boolean(this.parameter.desc);
    const limit = Math.max(0, Number(this.parameter.limit) || 0);
    let tags = await this.model('tag').getTagArchive();

    if (this.parameter.ignoreZeroCount) {
      tags = tags.filter(tag => tag.count > 0);
    }
    tags.sort((left, right) => {
      if (left[sort] === right[sort]) return 0;
      const result = left[sort] > right[sort] ? 1 : -1;
      return desc ? -result : result;
    });
    if (limit) {
      tags = tags.slice(0, limit);
    }
    this.pushAll(tags);
  }

  split(...sizes) {
    const count = Number(this.row.count) || 0;
    return sizes.find(size => count < size) || 0;
  }
};
