const fs = require('fs');
const url = require('url');
const path = require('path');
const Base = require('./base');

const renameAsync = think.promisify(fs.rename, fs);
module.exports = class extends Base {
  async uploadMethod(file, {name}) {
    let ext = /^\.\w+$/.test(path.extname(file)) ? path.extname(file) : '.png';
    let basename = (name || path.basename(file, ext)) + ext;
    //过滤 ../../
    basename = basename.replace(/[\\/]/g, '');

    let destDir = this.formatNow();
    let destPath = path.join(think.UPLOAD_PATH, destDir);
    if(!think.isDirectory(destPath)) {
      think.mkdir(destPath);
    }

    try {
      // 上传文件路径
      let filepath = path.join(destPath, basename);
      await renameAsync(file, filepath);
      return url.resolve(think.UPLOAD_BASE_URL, filepath.replace(think.RESOURCE_PATH, ''));
    } catch(e) {
      throw Error('FILE_UPLOAD_MOVE_ERROR');
    }
  }

  async run(file, config) {
    return await this.uploadMethod(file, config);
  }
}
