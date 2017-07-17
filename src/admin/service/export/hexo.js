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
date: ${post.create_time}
updated: ${post.update_time}
comments: ${post.allow_comment}
categories: ${post.cate.length ? post.cate[0].pathname : ''}
tags: [${post.tags.join()}]
permalink: ${post.pathname}
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
