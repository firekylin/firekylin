const dayjs = require('dayjs');
const TurndownService = require('turndown');

class Base extends think.Service {
  constructor(...args) {
    super(...args);
    this.userModelInstance = this.model('user');
    this.cateModelInstance = this.model('cate');
    this.tagModelInstance = this.model('tag');
    this.postModelInstance = this.model('post');
    this.pageModelInstance = this.model('page').setRelation('user');
    this.turndownService = new TurndownService();
  }

  formatDate(date) {
    return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
  }

  toMarkdown(content) {
    return this.turndownService.turndown(content);
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
   * 导入评论
   */
  async comment() {
    return 0;
  }

  /**
   * 处理上传文件获取导入数据
   */
  async parseFile(file) { // eslint-disable-line no-unused-vars

  }

  async importData(data) {
    const user = await this.user(data);
    const category = await this.category(data);
    const tag = await this.tag(data);
    const post = await this.post(data);
    const page = await this.page(data);
    const comment = await this.comment(data);

    return {user, post, page, comment, tag, category};
  }
}

// 必须挂在构造函数上：子类（ghost/wordpress）通过 Base.DEFAULT_USER_PWD
// 静态读取，写成 Base.prototype.DEFAULT_USER_PWD 时读到的是 undefined。
Base.DEFAULT_USER_PWD = 'admin12345678';
module.exports = Base;
