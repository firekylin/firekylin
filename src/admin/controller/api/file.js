import Base from './base';
import fs from 'fs';
import path from 'path';
import moment from 'moment';
import request from 'request';
import xml2js from 'xml2js';
import toMarkdown from 'to-markdown';

request.defaults({
  strictSSL: false,
  rejectUnauthorized: false
});

export default class extends Base {
  async postAction() {
    /** 处理远程抓取 **/
    if( this.post('fileUrl') ) {
      return this.getFileByUrl(this.post('fileUrl'));
    }
    /** 处理导入数据 **/
    if( this.post('importor') === 'wordpress' ) {
      return this.importFromWP();
    }

    let file = this.file('file');
    if( !file ) {
      if( this.post('fileUrl') ) {
        return this.getFileByUrl( this.post('fileUrl') );
      }
      return this.fail('FILE_UPLOAD_ERROR');
    }

    let contentType = file.headers['content-type']; //check content-type if you want;

    let basename = this.post('name') ? this.post('name') + path.extname(file.path) : path.basename(file.path);
    let destDir = moment(new Date).format('YYYYMM');
    let destPath = path.join( think.UPLOAD_PATH, destDir );
    if( !think.isDir(destPath) ) {
      think.mkdir(destPath);
    }

    let result = await think.promisify(fs.rename, fs)(file.path, path.join(destPath, basename));
    if( result ) {
      this.fail('FILE_UPLOAD_MOVE_ERROR');
    }
    return this.success(path.join('/static/upload', destDir, basename));
  }

  async getFileByUrl(url) {
    let fn = think.promisify(request.get);
    let result = await fn({
      url,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) Chrome/47.0.2526.111 Safari/537.36"
      },
      strictSSL: false,
      timeout: 1000,
      encoding: 'binary'
    }).catch(() =>{
      return this.fail("UPLOAD_URL_ERROR");
    });

    if(result.headers["content-type"].indexOf('image') === -1) {
      return this.fail("UPLOAD_TYPE_ERROR");
    };

    let writeFile = think.promisify(fs.writeFile, fs);
    let destDir = moment(new Date).format('YYYYMM');
    let basename = (this.post('name') ? this.post('name') : think.md5(result.body)) + path.extname(url);
    let destPath = path.join( think.UPLOAD_PATH, destDir );
    if( !think.isDir(destPath) ) {
      think.mkdir(destPath);
    }
    result = await writeFile( path.join(destPath, basename), result.body, 'binary');
    return this.success(path.join('/static/upload', destDir, basename));
  }

  async importFromWP() {
    let file = this.file('file');
    if( !file ) { return this.fail('FILE_UPLOAD_ERROR'); }

    let readFile = think.promisify(fs.readFile, fs);
    let parser = new xml2js.Parser();
    let parseString = think.promisify(parser.parseString, parser);
    let wxrXML = await readFile(file.path);
    let wxrJSON = await parseString(wxrXML);
    wxrJSON = this.formatArray(wxrJSON);
    let channel = wxrJSON.rss.channel;
    // 导入用户
    if( channel.hasOwnProperty('wp:author') ) {
      let authors = channel['wp:author'], userModelInstance = this.model('user');
      let authorsPromise = authors.map(author => userModelInstance.addUser({
        username: author['wp:author_login'][0],
        email: author['wp:author_email'][0],
        display_name: author['wp:author_display_name'][0],
        password: 'admin12345678',
        type: 2, //默认导入用户都为编辑
        status: 2, //默认导入用户都处于禁用状态
      }, '127.0.0.1'));
      await Promise.all(authorsPromise);
    }

    //导入分类
    //为了简单不支持子分类导入，默认所有分类为一级分类
    let categories = channel['wp:category'], cateModelInstance = this.model('cate');
    if( categories ) {
      let categoriesPromise = categories.map(cate => cateModelInstance.addCate({
        name: cate['wp:cat_name'][0],
        pathname: decodeURIComponent(cate['wp:category_nicename'][0]),
        pid: 0
      }));
      await Promise.all(categoriesPromise);
    }

    // 导入标签
    let tags = channel['wp:tag'], tagModelInstance = this.model('tag');
    if(tags) {
      let tagsPromise = tags.map(tag => tagModelInstance.addTag({
        name: tag['wp:tag_name'][0],
        pathname: decodeURIComponent(tag['wp:tag_slug'][0])
      }));
      await Promise.all(tagsPromise);
    }

    //导入文章
    let postStatus = {
      publish: 3, //发布
      future: 3,  //未来发布
      draft: 0, //草稿
      pending: 1, //待审核
      private: 3, //私密文章对应 is_public 字段为 false, 发布状态为已发布
      trash: 2, //删除文章没有对应关系遂转为已拒绝文章
    };
    let posts = channel.item.filter(item => item['wp:post_type'][0] ==='post');
    let postModelInstance = this.model('post');
    let postsPromise = posts.map(async item => {
      try{
      //获取用户
      let user = await this.model('user').where({name: item['dc:creator'][0]}).find();
      //查询分类 ID
      let cate = [];
      if( item.hasOwnProperty('category') ) {
        let cates = item.category.filter(item => item.$.domain === 'category').map(item => item._);
        if( Array.isArray(cates) && cates.length > 0 ) {
          cate = await this.model('cate').setRelation(false).field('id').where({name: ['IN', cates]}).select();
          cate = cate.map(item => item.id);
        }
      }
      //摘要有可能是空
      let summary;
      if( item.hasOwnProperty('excerpt:encoded') && item['excerpt:encoded'][0] !== '' ) {
        summary = item['excerpt:encoded'][0];
      } else {
        summary = item['content:encoded'][0];
      }
      
      let post = {
        title: item.title[0],
        pathname: decodeURIComponent(item['wp:post_name'][0]),
        content: item['content:encoded'][0],
        summary,
        create_time: moment(new Date(item.pubDate[0])).format('YYYY-MM-DD HH:mm:ss'),
        update_time: item['wp:post_date'][0],
        status: postStatus[ item['wp:status'][0] ] || 0,
        user_id: user.id,
        comment_num: 0,
        allow_comment: Number(item['wp:comment_status'][0] === 'open'),
        is_public: Number(item['wp:status'][0] !== 'private'),
        tag: item.hasOwnProperty('category') ? item.category.filter(item => item.$.domain === 'post_tag').map(item => item._) : [],
        cate
      };
      post.markdown_content = toMarkdown(post.content);
      await postModelInstance.addPost(post);
      } catch(e) { console.log(e)}
    });
    Promise.all(postsPromise);

    //导入页面
    let pages = channel.item.filter(item => item['wp:post_type'][0] === 'page');
    let pageModelInstance = this.model('page').setRelation('user');
    let pagesPromise = pages.map(async item => {
      let user = await this.model('user').where({name: item['dc:creator'][0]}).find();
      let summary = item['excerpt:encoded'][0];
      if( summary === '' ) {
        summary = item['content:encoded'][0];
      }

      let page = {
        title: item.title[0],
        pathname: decodeURIComponent(item['wp:post_name'][0]),
        content: item['content:encoded'][0],
        summary,
        create_time: moment(new Date(item.pubDate[0])).format('YYYY-MM-DD HH:mm:ss'),
        update_time: item['wp:post_date'][0],
        status: postStatus[ item['wp:status'][0] ] || 0,
        user_id: user.id,
        comment_num: 0,
        allow_comment: item['wp:comment_status'][0] === 'open',
        is_public: item['wp:status'][0] !== 'private',
      };
      page.markdown_content = toMarkdown(page.content);
      await pageModelInstance.addPost(page);
    });
    Promise.all(pagesPromise);
    this.success(`共导入文章 ${(posts || []).length} 篇，页面 ${(pages || []).length} 页，分类 ${(categories || []).length} 个，标签 ${(tags || []).length} 个`);
  }

  formatArray(obj) {
    for(var i in obj) {
      if( Array.isArray(obj[i]) && obj[i].length === 1 ) {
        obj[i] = obj[i][0];
      } else if( typeof(obj[i]) === 'object' ) {
        obj[i] = this.formatArray(obj[i]);
      }
    }
    return obj;
  }
}
