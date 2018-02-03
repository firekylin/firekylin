const path = require('path');
const Base = require('./base');

module.exports = class extends Base {
  constructor(...args) {
    super(...args);
    this.outputFile = path.join(think.RUNTIME_PATH, 'export_markdown.zip');
  }

  generate(posts) {
    return this.generateZipFile(this.outputFile, zip => {
      for (let post of posts) {
        zip.file(`${think.datetime(post.create_time, 'YYYY-MM-DD-')}${post.title}.md`, post.markdown_content);
      }
    });
  }

  async run() {
    let posts = await this.getPosts();
    return this.generate(posts);
  }
}
