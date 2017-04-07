import path from 'path';
import Base from './base';
import url from 'url';

export default class extends Base {
  uploadConfig = {};

  async __before() {
    this.uploadConfig = await this.getUploadConfig();
  }

  async postAction() {
    let {type} = this.uploadConfig;
    let config = this.uploadConfig;

    /** 处理远程抓取 **/
    if( this.post('fileUrl') ) {
      try {
        // 先存到本地
        const uploader = think.service('upload/remote', 'admin');
        const result = await (new uploader()).run(this.post('fileUrl'), {name: this.post('name')});

        // 如果是本地上传
        if (type === 'local' || !type) {
          return this.success(url.resolve(think.UPLOAD_BASE_URL, result));
        }

        return this.serviceUpload(type, path.join(think.RESOURCE_PATH, result), config);
      } catch (e) {
        this.fail(e || 'FILE_UPLOAD_ERROR');
      }
    }

    let file = this.file('file');
    if( !file ) { return this.fail('FILE_UPLOAD_ERROR'); }

    /** 处理导入数据 **/
    if( this.post('importor') ) {
      return this.serviceImport( this.post('importor'), file );
    }

    /** 检查文件类型 */
    // let contentType = file.headers['content-type']; 

    // 处理其它上传
    
    if( !type ) { return this.fail(); }
    if(type == 'local') {
      config = {name: this.post('name')};
    }
    
    return this.serviceUpload(type, file.path, config);
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
      const result = await (new uploader).run(file, config);
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
      console.log(e);
      return this.fail(e);
    }
  }
}
