import os from 'os';
import fs from 'fs';
import path from 'path';
import request from 'request';

import Base from './base';

request.defaults({
  strictSSL: false,
  rejectUnauthorized: false
});

const getFileContent = think.promisify(request.get, request);
const writeFileAsync = think.promisify(fs.writeFile, fs);

const ALLOW_CONTENT_TYPES = [
  /** 图片文件 */
  ['.gif', /^image\/gif$/i],
  ['.jpeg', /^(?:image\/jpeg|application\/x-jpg)$/i],
  ['.png', /^(?:image\/png|application\/x-png)$/i],
  ['.tiff', /^image\/tiff$/i],
  ['.bmp', /^application\/x-bmp$/i],

  /** 多媒体文件 */
  ['.mp3', /^audio\/mp3$/i],
  ['.wmv', /^video\/x-ms-wmv$/i],
  ['.mp4', /^video\/mpeg4$/i],
  ['.avi', /^video\/avi$/i],
  ['.flv', /^video\/flv$/i],

  /** 常用档案文件 */
  ['.txt', /^text\/plain$/i],
  ['.xml', /^text\/xml$/i],
  ['.json', /^application\/json$/i],
  ['.doc', /^application\/msword$/],
  ['.xls', /^(application\/x-xls|application\/vnd\.ms-excel)$/i],
  ['.ppt', /^(application\/x-ppt|application\/vnd\.ms-powerpoint)$/i],
  ['.zip', /^application\/(zip|octet-stream)$/i],
  ['.rar', /^application\/x-rar-comporessed$/i],
  ['.pdf', /^application\/pdf$/i],
  ['.tar.gz', /^application\/tar(\+gzip)?$/i]
];

export default class extends Base {
  uploadConfig = {};

  async __before() {
    await super.__before();
    this.uploadConfig = await this.getUploadConfig();
  }

  async postAction() {
    let config = this.uploadConfig;
    let {type} = config;
    let file;

    /** 处理远程抓取 **/
    if(this.post('fileUrl')) {
      try {
        file = await this.getUrlFile(this.post('fileUrl'));
      } catch(e) {
        return this.fail(e.message);
      }
    } else {
      file = this.file('file');
    }
    if(!file) { return this.fail('FILE_UPLOAD_ERROR'); }

    /** 检查文件类型 */
    const ext = this.extWhiteList(file);
    if(!ext) {
      return this.fail('FILE_FORMAT_NOT_ALLOWED');
    }

    /** 处理导入数据 **/
    if(this.post('importor')) {
      return this.serviceImport(this.post('importor'), file);
    }

    // 处理其它上传
    if(!type) { return this.fail(); }
    if(type === 'local') {
      config = {name: this.post('name')};
    }

    return this.serviceUpload(type, file.path, config);
  }

  // 导出其他平台数据
  async getAction() {
    if(this.get('exporter')) {
      return this.serviceExport(this.get('exporter'));
    }
    return this.success();
  }

  //MIME过滤
  extWhiteList(file) {
    let contentType = file.headers['content-type'];
    return ALLOW_CONTENT_TYPES.some(type =>
      type[1].test(contentType)
    );
  }

  // 获取上传设置
  async getUploadConfig() {
    const options = await this.model('options').getOptions();
    return options.upload;
  }

  /**
   * 上传文件
   */
  async serviceUpload(service, file, config) {
    try {
      const uploader = think.service(`upload/${service}`, 'admin');
      const result = await (new uploader()).run(file, config);
      return this.success(result);
    } catch (e) {
      return this.fail(e || 'FILE_UPLOAD_ERROR');
    }
  }

  /**
   * 从其他平台导入数据
   */
  async serviceImport(service, file) {
    try {
      let importor = think.service(`import/${service}`, 'admin');
      let {post, page, category, tag} = await (new importor(this)).run(file);
      return this.success(`共导入文章 ${post} 篇，页面 ${page} 页，分类 ${category} 个，标签 ${tag} 个`);
    } catch(e) {
      return this.fail(e);
    }
  }

  /**
   * 导出数据到其它平台
   */
  async serviceExport(service) {
    try {
      let exporter = think.service(`export/${service}`, 'admin');
      let file = await (new exporter()).run();
      return this.download(file);
    } catch(e) {
      return this.fail(e);
    }
  }

  async getUrlFile(url) {
    let resp = await getFileContent({
      url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) Chrome/47.0.2526.111 Safari/537.36'
      },
      strictSSL: false,
      timeout: 1000,
      encoding: 'binary'
    }).catch(() => { throw new Error('UPLOAD_URL_ERROR'); });

    if(resp.headers['content-type'].indexOf('image') === -1) {
      throw new Error('UPLOAD_TYPE_ERROR');
    }

    let uploadDir = this.config('post').file_upload_path;
    if(!uploadDir) {
      uploadDir = path.join(os.tmpdir(), 'thinkjs/upload');
    }
    if(!think.isDir(uploadDir)) {
      think.mkdir(uploadDir);
    }

    let uploadName = think.uuid(20) + path.extname(url);
    let uploadPath = path.join(uploadDir, uploadName);
    await writeFileAsync(uploadPath, resp.body, 'binary');

    return {
      fieldName: 'file',
      originalFilename: path.basename(url),
      path: uploadPath,
      size: resp.headers['content-length']
    };
  }
}
