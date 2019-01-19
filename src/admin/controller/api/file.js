const fs = require('fs');
const dns = require('dns');
const path = require('path');
const { parse } = require('url');
const request = require('request');
const onFinish = require('on-finished');
const Base = require('./base');

const INTERNAL_AREAS = [
  ['10.0.0.0', '10.255.255.255'],
  ['172.16.0.0', '172.31.255.255'],
  ['192.168.0.0', '192.168.255.255'],
  ['127.0.0.1', '127.255.255.255']
];

function ip2long(ip) {
  const multi = [0x1000000, 0x10000, 0x100, 1];
  let longValue = 0;
  ip.split('.').forEach((part, i) => longValue += part * multi[i]);
  return longValue;
}

const reqIns = request.defaults({
  strictSSL: false,
  rejectUnauthorized: false
});

const getFileContent = think.promisify(reqIns.get, reqIns);
const writeFileAsync = think.promisify(fs.writeFile, fs);
const unlinkAsync = think.promisify(fs.unlink, fs);
const lookupAsync = think.promisify(dns.lookup, dns);

const ALLOW_EXTS = [
  /** 图片文件 */
  /\.(gif|jpe?g|png|tiff|bmp|ico)$/i,
  /** 多媒体文件 */
  /\.(mp3|wmv|mp4|avi|flv)$/i,
  /** 常用档案文件 */
  /\.(txt|xml|json|docx?|xlsx?|pptx?)$/i,
  /\.(zip|rar|pdf|gz)$/i
];

module.exports = class extends Base {
  constructor(...args) {
    super(...args);
    this.uploadConfig = {};
  }

  async __before() {
    await super.__before();
    this.uploadConfig = await this.getUploadConfig();
  }

  async postAction() {
    let config = this.uploadConfig;
    let { type } = config;
    let file;

    /** 处理远程抓取 **/
    if (this.post('fileUrl')) {
      try {
        file = await this.getUrlFile(this.post('fileUrl'));
      } catch (e) {
        return this.fail(e.message);
      }
    } else {
      file = this.file('file');
    }
    if (!file) { return this.fail('FILE_UPLOAD_ERROR'); }

    /** 检查文件类型 */
    const ext = this.extWhiteList(file);
    if (!ext) {
      return this.fail('FILE_FORMAT_NOT_ALLOWED');
    }

    /** 处理导入数据 **/
    if (this.post('importor')) {
      return this.serviceImport(this.post('importor'), file);
    }

    // 处理其它上传
    if (!type) { return this.fail(); }
    if (type === 'local') {
      config = { name: this.post('name') };
    }

    config.file = file;
    return this.serviceUpload(type, file.path, config);
  }

  // 导出其他平台数据
  async getAction() {
    if (this.get('exporter')) {
      return this.serviceExport(this.get('exporter'));
    }
    return this.success();
  }

  //MIME过滤
  extWhiteList(file) {
    return ALLOW_EXTS.some(reg => reg.test(file.name));
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
      const result = await uploader.run(file, config);
      return this.success(result);
    } catch (e) {
      if (think.isPrevent(e)) {
        return true;
      }

      console.log(e); //eslint-disable-line no-console
      return this.fail(e.message || 'FILE_UPLOAD_ERROR');
    }
  }

  /**
   * 从其他平台导入数据
   */
  async serviceImport(service, file) {
    let ret = { post: 0, page: 0, category: 0, tag: 0 };
    try {
      const importor = think.service(`import/${service}`, 'admin', this);
      ret = await importor.run(file);
    } catch (e) {
      return this.fail(e);
    }
    return this.success(`共导入文章 ${ret.post} 篇，页面 ${ret.page} 页，分类 ${ret.category} 个，标签 ${ret.tag} 个`);
  }

  /**
   * 导出数据到其它平台
   */
  async serviceExport(service) {
    try {
      let exporter = think.service(`export/${service}`, 'admin');
      let file = await exporter.run();
      return this.download(file);
    } catch (e) {
      return this.fail(e.message);
    }
  }

  async getUrlFile(url) {
    let { hostname } = parse(url);
    if (!/^\d+\.\d+\.\d+\.\d+/i.test(hostname)) {
      hostname = await lookupAsync(hostname);
    }
    const longIP = ip2long(hostname);
    for (let [start, end] of INTERNAL_AREAS) {
      start = ip2long(start);
      end = ip2long(end);
      if (longIP >= start && longIP <= end) {
        throw new Error('URL ILLEGAL');
      }
    }


    let resp = await getFileContent({
      url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) Chrome/47.0.2526.111 Safari/537.36'
      },
      strictSSL: false,
      timeout: 1000,
      encoding: 'binary'
    }).catch(() => { throw new Error('UPLOAD_URL_ERROR'); });

    if (resp.headers['content-type'].indexOf('image') === -1) {
      throw new Error('UPLOAD_TYPE_ERROR');
    }

    // let uploadDir = this.config('post').file_upload_path;
    // if(!uploadDir) {
    const uploadDir = think.TMPDIR_PATH;
    // }
    if (!think.isDirectory(uploadDir)) {
      think.mkdir(uploadDir);
    }

    let uploadName = think.uuid(20) + path.extname(url);
    let uploadPath = path.join(uploadDir, uploadName);
    await writeFileAsync(uploadPath, resp.body, 'binary');

    //after upload delete file
    onFinish(this.ctx.res, () =>
      think.isExist(uploadPath) && unlinkAsync(uploadPath)
    );

    return {
      name: path.basename(url),
      path: uploadPath,
      size: resp.headers['content-length'],
      type: resp.headers['content-type']
    };
  }
}
