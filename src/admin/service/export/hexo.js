import path from 'path';
import Base from './base';

export default class extends Base {
  constructor(...args) {
    super(...args);
    this.outputFile = path.join(think.RUNTIME_PATH, 'export_hexo.zip');
  }

  generate(posts) {
    return this.generateZipFile(this.outputFile, zip => {
      for(let post of posts) {
        let content = `
---
title: ${post.title}
date: ${post.date}
categories: ${post.cate.join()}
tags: ${post.tags.join()}
---
${post.markdown_content}`;
        zip.file(`${think.datetime(post.create_time, 'YYYY-MM-DD-')}${post.title}.md`, content);
      }
    });
  }

  async run() {
    let posts = await this.getPosts();
    return this.generate(posts);
  }
}
