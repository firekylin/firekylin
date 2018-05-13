const moment = require('moment');
const toMarkdown = require('to-markdown');

class Base extends think.Service {
  constructor(...args) {
    super(...args);
    this.userModelInstance = this.model('user', null, 'admin');
    this.cateModelInstance = this.model('cate', null, 'admin');
    this.tagModelInstance = this.model('tag', null, 'admin');
    this.postModelInstance = this.model('post', null, 'admin');
    this.pageModelInstance = this.model('page', null, 'admin').setRelation('user');
  }

  formatDate(date) {
    return moment(date).format('YYYY-MM-DD HH:mm:ss');
  }

  toMarkdown(content) {
    return toMarkdown(content);
  }

  /**
   * 导入用户
   */
  async user() {

  }

  /**
   * 导入分类
   */
  async category() {

  }

  /**
   * 导入标签
   */
  async tag() {

  }

  /**
   * 导入文章
   */
  async post() {

  }

  /**
   * 导入页面
   */
  async page() {

  }

  /**
   * 处理上传文件获取导入数据
   */
  async parseFile(file) { // eslint-disable-line no-unused-vars

  }

  async importData(data) {
    let user = await this.user(data);
    let category = await this.category(data);
    let tag = await this.tag(data);
    let post = await this.post(data);
    let page = await this.page(data);

    return {user, post, page, tag, category};
  }
}

Base.prototype.DEFAULT_USER_PWD = 'admin12345678';
module.exports = Base;
