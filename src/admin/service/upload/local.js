import path from 'path';
import fs from 'fs';
import Base from './base';

const moveFile = think.promisify(fs.rename, fs);
export default class extends Base {
  async uploadMethod(file, {name}) {
    let ext = /^\.\w+$/.test(path.extname(file)) ? path.extname(file) : '.png';
    let basename = (name || path.basename(file, ext)) + ext;

    let destDir = this.formatNow();
    let destPath = path.join( think.UPLOAD_PATH, destDir );
    if( !think.isDir(destPath) ) {
      think.mkdir(destPath);
    }

    try {
      await moveFile(file, path.join(destPath, basename));
      return think.UPLOAD_BASE_URL + path.join(think.UPLOAD_PATH.replace(think.RESOURCE_PATH, ''), destDir, basename);
    } catch(e) {
      throw Error('FILE_UPLOAD_MOVE_ERROR');
    }
  }

  async run(file, config) {
    return await this.uploadMethod(file, config);
  }
}