const fs = require('fs');
const dns = require('dns');
const path = require('path');
const { parse } = require('url');
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
  ip.split('.').forEach((part, i) => {
    longValue += part * multi[i];
  });
  return longValue;
}

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
  /\.(zip|rar|pdf|gz|tgz)$/i
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
    const { type } = config;
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
    if (!file) { return this.fail('FILE_UPLOAD_ERROR') }

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
    if (!type) { return this.fail() }
    if (type === 'local') {
      config = {type, name: this.post('name')};
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

  // MIME过滤
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
      const sdkServices = ['r2', 'minio', 'backblaze', 'wasabi', 'digitalocean', 'vercel'];
      const serviceName = sdkServices.includes(service) ? 'files-sdk' : service;
      const uploader = think.service(`upload/${serviceName}`);
      const result = await uploader.run(file, config);
      const attachment = await this.createAttachment(result, config.file, service);
      // Existing upload consumers expect a URL string. Editors may opt in to
      // the attachment ID so a newly created page can retain its uploads.
      if (this.post('attachmentInfo') === '1') {
        return this.success({url: result, id: attachment.id});
      }
      return this.success(result);
    } catch (e) {
      if (think.isPrevent(e)) {
        return true;
      }

      console.log(e); // eslint-disable-line no-console
      return this.fail(e.message || 'FILE_UPLOAD_ERROR');
    }
  }

  /**
   * 将上传结果登记为可复用的附件内容。保持上传接口原有的 URL 返回值，
   * 以兼容编辑器、站点图标等现有调用方。
   */
  async createAttachment(url, file, storage) {
    const now = think.datetime();
    const name = file.name || path.basename(url);
    const attachment = {
      name,
      url,
      size: Number(file.size) || 0,
      mime: file.type || 'application/octet-stream',
      storage
    };
    return this.model('post').addPost({
      user_id: this.userInfo.id,
      type: 2,
      status: 3,
      title: name,
      pathname: think.uuid(20),
      summary: '',
      markdown_content: '',
      content: '',
      allow_comment: 0,
      create_time: now,
      update_time: now,
      is_public: 1,
      comment_num: 0,
      options: JSON.stringify({attachment})
    });
  }

  /**
   * 从其他平台导入数据
   */
  async serviceImport(service, file) {
    let ret = { post: 0, page: 0, category: 0, tag: 0 };
    try {
      const servicePath = service === 'hugo' ? 'import/hugo/index' : `import/${service}`;
      const importor = think.service(servicePath, this);
      ret = await importor.run(file);
    } catch (e) {
      return this.fail(e);
    }
    const comment = ret.comment ? `，评论 ${ret.comment} 条` : '';
    return this.success(`共导入文章 ${ret.post} 篇，页面 ${ret.page} 页，分类 ${ret.category} 个，标签 ${ret.tag} 个${comment}`);
  }

  /**
   * 导出数据到其它平台
   */
  async serviceExport(service) {
    try {
      const exporter = think.service(`export/${service}`);
      const file = await exporter.run();
      return this.download(file);
    } catch (e) {
      return this.fail(e.message);
    }
  }

  async getUrlFile(url) {
    const response = await this.fetchUrlFile(url);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('image')) {
      throw new Error('UPLOAD_TYPE_ERROR');
    }

    const body = Buffer.from(await response.arrayBuffer());

    // let uploadDir = this.config('post').file_upload_path;
    // if(!uploadDir) {
    const uploadDir = think.TMPDIR_PATH;
    // }
    if (!think.isDirectory(uploadDir)) {
      think.mkdir(uploadDir);
    }

    const uploadName = think.uuid(20) + path.extname(url);
    const uploadPath = path.join(uploadDir, uploadName);
    await writeFileAsync(uploadPath, body);

    // after upload delete file
    onFinish(this.ctx.res, () =>
      think.isExist(uploadPath) && unlinkAsync(uploadPath)
    );

    return {
      name: path.basename(url),
      path: uploadPath,
      size: response.headers.get('content-length') || body.length,
      type: contentType
    };
  }

  async fetchUrlFile(url, redirectCount = 0) {
    if (redirectCount > 5) {
      throw new Error('UPLOAD_URL_ERROR');
    }

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

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) Chrome/47.0.2526.111 Safari/537.36'
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(1000)
    }).catch(() => { throw new Error('UPLOAD_URL_ERROR') });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('UPLOAD_URL_ERROR');
      }
      return this.fetchUrlFile(new URL(location, url).toString(), redirectCount + 1);
    }
    if (!response.ok) {
      throw new Error('UPLOAD_URL_ERROR');
    }
    return response;
  }
};
