const ContentsWidget = require('../../base/contents');

module.exports = class extends ContentsWidget {
  async execute() {
    const requestedPageSize = Number(this.parameter.pageSize);
    const pageSize = requestedPageSize > 0 ? requestedPageSize : await this.model('post').getPostsListSize();
    const result = await this.model('post').getPostList(1, {pageSize});
    this.pushAll(result.data || []);
  }
};
