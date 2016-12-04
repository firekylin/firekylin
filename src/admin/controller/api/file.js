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

    // qiniu && upyun
    const uploadConfig = this.uploadConfig;
    if (uploadConfig.type === 'qiniu') {
      return this.uploadByQiniu(file.path, uploadConfig);
    } else if (uploadConfig.type === 'upyun') {
      return this.uploadByUpyun(file.path, uploadConfig);
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

  // 域名不带http/https自动补全http
  getAbsOrigin(origin) {
    const reg = /^https?:\/\/.+/;
    if (!reg.test(origin)) {
      return `http://${origin}`;
    }
    return origin;
  }

  // 七牛相关方法
  async qiniuUpload(filename, config) {
    qiniu.conf.ACCESS_KEY = config.accessKey;
    qiniu.conf.SECRET_KEY = config.secretKey;
    const prefix = config.prefix ? `${config.prefix}/` : '';
    const dir = moment(new Date()).format("YYYYMMDD");
    const basename = path.basename(filename);
    const savePath = `${prefix}${dir}/${basename}`;
    const token = new qiniu.rs.PutPolicy(`${config.bucket}:${savePath}`).token();
    const extra = new qiniu.io.PutExtra();
    return new Promise((resolve, reject) => {
      qiniu.io.putFile(token, savePath, filename, extra, (err, ret) => {
        if (err) {
          reject(err);
        } else {
          const origin = this.getAbsOrigin(config.origin);
          const compeletePath = `${origin}/${ret.key}`;
          resolve(compeletePath);
        }
      });
    });
  }

  async uploadByQiniu(filename, config) {
    const result = await this.qiniuUpload(filename, config).catch((err) => {
      return this.fail("FILE_UPLOAD_ERROR");
    })
    return this.success(result);
  }


  // 又拍云相关方法
  async upyunUpload(filename, config) {
    const upyunInstance = new upyun(
      config.upyunBucket, config.operater, config.password, 'v0.api.upyun.com', { apiVersion: 'v2' }
    );
    const prefix = config.upyunPrefix ? `${config.upyunPrefix}/` : '';
    const dir = moment(new Date()).format("YYYYMMDD");
    const basename = path.basename(filename);
    const remotePath = `${prefix}${dir}/${basename}`;
    return new Promise((resolve, reject) => {
      upyunInstance.putFile(remotePath, filename, null, false, {
        'save-key': '/{year}{mon}{day}/{filename}{.suffix}'
      }, (err, res) => {
        if (err) {
          reject(err);
        } else {
          if (res.statusCode === 200) {
            const origin = this.getAbsOrigin(config.upyunOrigin);
            const compeletePath = `${origin}/${remotePath}`;
            resolve(compeletePath);
          } else {
            reject(res);
          }
        }
      });
    });
  }

  async uploadByUpyun(filename, config) {
    const result = await this.upyunUpload(filename, config).catch((err) => {
      return this.fail("FILE_UPLOAD_ERROR");
    })
    return this.success(result);
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
