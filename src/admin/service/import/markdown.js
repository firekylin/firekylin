import Base from './base';
import Post from '../../controller/api/post.js';

import fs from 'fs';
import path from 'path';
import {execSync} from 'child_process';

const PATH = path.join(think.RUNTIME_PATH, 'importMarkdownFileToFirekylin');
export default class extends Base {
  constructor(args) {
    super(...args);
    this.post = new Post(this.http);
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
        const user = await this.session('userInfo');
      
        const post = {
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
        await this.post.getContentAndSummary(post);
        await this.postModelInstance.addPost(post);
      } catch(e) { console.log(e)}
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
      execSync('rm -rf ${PATH}; tar zvxf ${file.path} ${PATH}');
      let files = fs.readdir(PATH, {encoding: 'utf-8'});
      if( !files.length ) { return []; }

      return files.map(function(file) {
        let tar = path.join(PATH, file);
        let title = file.split('.').slice(0,-1).join('');
        let content = fs.readFileSync(tar, {encoding: 'utf-8'});
        let stat = fs.statSync(tar);
        return {
          created_at: stat.birthtime.getTime(),
          updated_at: stat.mtime.getTime(),
          title,
          pathname: title,
          markdown_content: content
        };
      });
    } catch(e) {
      throw new Error(e);
    }
  }
}