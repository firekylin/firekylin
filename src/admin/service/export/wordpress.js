const fs = require('fs');
const path = require('path');
const Wxr = require('wxr');
const Base = require('./base');

//eslint-disable-next-line no-control-regex
const NOT_SAFE_IN_XML = /[^\x09\x0A\x0D\x20-\xFF\x85\xA0-\uD7FF\uE000-\uFDCF\uFDE0-\uFFFD]/gm;
module.exports = class extends Base {
  constructor(...args) {
    super(...args);
    this.outputFile = path.join(think.RUNTIME_PATH, 'output_wordpress.xml');
  }
  async run() {
    let importer = new Wxr();

    let posts = await this.getPosts();
    for(let post of posts) {
      post.content = post.content.replace(NOT_SAFE_IN_XML, '');
      post.summary = post.summary.replace(NOT_SAFE_IN_XML, '');

      importer.addPost({
        id: post.id,
        title: post.title,
        date: think.datetime(post.create_time),
        contentEncoded: post.content,
        excerptEncoded: post.summary,
        categories: post.cate
      })
    }

    let cateList = await this.model('cate').select();
    for(let cate of cateList) {
      importer.addCategory({
        id: cate.id,
        title: cate.name,
        slug: cate.pathname
      });
    }

    try {
      fs.writeFileSync(
        this.outputFile,
        importer.stringify()
      )
      return this.outputFile;
    } catch (e) {
      throw new Error(e);
    }
  }
}
