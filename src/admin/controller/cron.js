module.exports = class extends think.Controller {
  constructor(...args) {
    super(...args);

    this.model = {
      option: this.model('options'),
      user: this.model('user'),
      post: this.model('post')
    };
  }

  async rssAction() {
    const {
      option: optionModel,
      post: postModel,
      user: userModel
    } = this.model;
    const feedParser = this.service('feed', {
      normalize: true,
      addmeta: false
    });
    const {rssImportList} = await optionModel.getOptions();
    const {id: user_id} = await userModel.find();

    for(const rss of rssImportList) {
      const feeds = await feedParser.run(rss.url, {
        normalize: true,
        addmeta: false
      });

      for(let post of feeds) {
        post.user_id = rss.user || user_id;
        post = await postModel.getContentAndSummary(post);
        post = postModel.getPostTime(post);
        post.status = 3;
        if(rss.cate) {
          post.cate = [post.cate];
        }

        const {id, type} = await postModel.addPost(post);
        if(type === 'exist') {
          think.logger.warn(`《${post.title}》已存在`);
        } else {
          think.logger.info(`《${post.title}》导入成功，ID 为 ${id}`);
        }
      }
    }

    return this.success();
  }
}
