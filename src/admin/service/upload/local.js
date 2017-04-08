import fs from 'fs';
import url from 'url';
import path from 'path';
import Base from './base';

const renameAsync = think.promisify(fs.rename, fs);
export default class extends Base {
  async uploadMethod(file, {name}) {
    let ext = /^\.\w+$/.test(path.extname(file)) ? path.extname(file) : '.png';
    let basename = (name || path.basename(file, ext)) + ext;

    let destDir = this.formatNow();
    let destPath = path.join(think.UPLOAD_PATH, destDir);
    if(!think.isDir(destPath)) {
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
