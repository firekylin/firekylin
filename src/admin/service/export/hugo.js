const path = require('path');
const Base = require('./base');

module.exports = class extends Base {
  constructor(...args) {
    super(...args);
    this.outputFile = path.join(think.RUNTIME_PATH, 'export_hugo.zip');
  }

  generate(posts) {
    return this.generateZipFile(this.outputFile, zip => {
      for(let post of posts) {
        let content = `
---
title: "${post.title}"
date: "${post.create_time}"
slug: ${post.pathname}
draft: ${post.status !== 3 || !post.is_public ? 'true' : 'false'}
lastMod: ${post.update_time}
comments: ${post.allow_comment}
categories: ${post.cate.length ? post.cate[0].pathname : ''}
tags: ${JSON.stringify(post.tag.map(tag => tag.name))}
---

${post.markdown_content}`;

        zip.file(`content/post/${think.datetime(post.create_time, 'YYYY/MM')}/${post.title}.md`, content);
      }
    });
  }

  async run() {
    let posts = await this.getPosts();
    return this.generate(posts);
  }
}
