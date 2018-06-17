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
        post.addIns
        post.user_id = rss.user || user_id;
        post = await postModel.getContentAndSummary(post);
        post = postModel.getPostTime(post);
        post.status = 3;
        if(rss.cate) {
          post.cate = [post.cate];
        }

        const insertId = await postModel.addPost(post);
        think.logger.info(`导入文章 ${insertId} 成功`);
      }
    }

    return this.success();
  }
}
