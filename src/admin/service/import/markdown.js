const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const Base = require('./base');

const PATH = path.join(think.RUNTIME_PATH, 'importMarkdownFileToFirekylin');
module.exports = class extends Base {
  constructor(think) {
    super(think);
    this._think = think;
  }
  /**
   * 导入用户
   */
  async user() {
    return 0;
  }

  /**
   * 导入分类
   */
  async category() {
    return 0;
  }

  /**
   * 导入标签
   */
  async tag() {
    return 0;
  }

  /**
   * 导入文章
   */
  async post(posts = []) {
    if(!Array.isArray(posts)) {
      return 0;
    }


    const postsPromise = posts.map(async item => {
      try{
        //获取用户
        const user = await this._think.session('userInfo');

        let post = {
          title: item.title,
          pathname: item.pathname,
          markdown_content: item.markdown_content,
          create_time: this.formatDate(new Date(item.created_at)),
          update_time: this.formatDate(new Date(item.updated_at)),
          status: 3,
          user_id: user.id,
          comment_num: 0,
          allow_comment: 1,
          is_public: 1,
          type: 0
        };
        post = await think.model('post', null, 'admin').getContentAndSummary(post);
        await this.postModelInstance.addPost(post);
      } catch(e) {
        console.log(e); // eslint-disable-line no-console
      }
    });
    Promise.all(postsPromise);

    return posts.length;
  }

  /**
   * 导入页面
   */
  async page() {
    return 0;
  }

  parseFile(file) {
    try {
      const filePath = file.path.replace(/[^a-zA-Z0-9./_-]/g, '');
      execSync(`rm -rf ${PATH}; mkdir ${PATH}; cd ${PATH}; tar zxvf "${filePath}"`);
      let files = fs.readdirSync(PATH, {encoding: 'utf-8'});
      if(!files.length) { return []; }

      return files.map(function(file) {
        let tar = path.join(PATH, file);
        let title = file.split('.').slice(0, -1).join('');
        let content = fs.readFileSync(tar, {encoding: 'utf-8'});
        let stat = fs.statSync(tar);

        //add symbilic link check
        if(fs.lstatSync(tar).isSymbolicLink()) {
          return null;
        }

        return {
          created_at: stat.birthtime.getTime(),
          updated_at: stat.mtime.getTime(),
          title,
          pathname: title,
          markdown_content: content
        };
      }).filter(v => v);
    } catch(e) {
      throw new Error(e);
    }
  }

  /**
   * 执行导入
   */
  async run(file) {
    return await this.importData(this.parseFile(file));
  }
}
