import Base from './base';
import fs from 'fs';
import path from 'path';
import moment from 'moment';
import request from 'request';
import xml2js from 'xml2js';
import toMarkdown from 'to-markdown';
import qiniu from 'qiniu';
import upyun from 'upyun';

request.defaults({
  strictSSL: false,
  rejectUnauthorized: false
});

export default class extends Base {
  uploadConfig = {};

  async __before() {
    this.uploadConfig = await this.getUploadConfig();
  }

  async postAction() {
    /** 处理远程抓取 **/
    if( this.post('fileUrl') ) {
      return this.getFileByUrl(this.post('fileUrl'));
    }

    let file = this.file('file');
    if( !file ) { return this.fail('FILE_UPLOAD_ERROR'); }

    /** 处理导入数据 **/
    if( this.post('importor') ) {
      return this.import( this.post('importor'), file );
    }

    // 处理CDN上传
    const uploadConfig = this.uploadConfig;
    if (uploadConfig.type && uploadConfig.type !== 'local') {
      return this.serviceUpload(uploadConfig.type, file.path, uploadConfig);
    }

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

  // 获取上传设置
  async getUploadConfig() {
    const options = await this.model('options').getOptions();
    return options.upload;
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

  // CDN上传
  async serviceUpload(service, file, config) {
    try {
      const uploader = think.service(`upload/${service}`, 'admin');
      const result = await (new uploader).run(file, config);
      return this.success(result);
    } catch (e) {
      // return this.fail(e);
      return this.fail("FILE_UPLOAD_ERROR");
    }
  }

  /**
   * 从其他平台导入数据
   */
  async import(service, file) {
    try {
      let importor = think.service(`import/${service}`, 'admin');
      let {post, page, category, tag} = await (new importor).run(file);
      return this.success(`共导入文章 ${post} 篇，页面 ${page} 页，分类 ${category} 个，标签 ${tag} 个`);
    } catch(e) {
      return this.fail(e);
    }
  }
}
