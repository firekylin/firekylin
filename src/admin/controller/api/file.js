import os from 'os';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import request from 'request';
import JSZip from 'jszip';

import Base from './base';

request.defaults({
  strictSSL: false,
  rejectUnauthorized: false
});

const getFileContent = think.promisify(request.get, request);
const writeFileAsync = think.promisify(fs.writeFile, fs);

export default class extends Base {
  uploadConfig = {};

  async __before() {
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

    /** 处理导入数据 **/
    if(this.post('importor')) {
      return this.serviceImport(this.post('importor'), file);
    }

    /** 检查文件类型 */
    // let contentType = file.headers['content-type'];

    // 处理其它上传
    if(!type) { return this.fail(); }
    if(type === 'local') {
      config = {name: this.post('name')};
    }

    return this.serviceUpload(type, file.path, config);
  }

  // 导出 Markdown 文件
  async getAction() {
    const PATH = path.join(think.RUNTIME_PATH, 'exportedMarkdownFiles');

    if (this.get('type') === 'markdown') {
      let num = await this.model('post').getCount();
      let data = await this.model('post').getLatest(0, num);
      try {
        execSync(`rm -rf ${PATH}; mkdir ${PATH};`);
        let zip = new JSZip();
        for (let item of data) {
          zip.file(`${think.datetime(item['create_time'], 'YYYY-MM-DD-')}${item['title']}.md`, item['markdown_content']);
        }

        zip
          .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
          .pipe(fs.createWriteStream(path.join(PATH, 'export.zip')))
          .on('finish', () => this.download(path.join(PATH, 'export.zip')));
      } catch (e) {
        throw new Error(e);
      }
    } else {
      this.success();
    }
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
