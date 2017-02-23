import path from 'path';
import fs from 'fs';
import Base from './base';

const moveFile = think.promisify(fs.rename, fs);
export default class extends Base {
  async uploadMethod(file, {name}) {
    let basename = name ? name + path.extname(file) : path.basename(file) + '.png';
    let destDir = this.formatNow();
    let destPath = path.join( think.UPLOAD_PATH, destDir );
    if( !think.isDir(destPath) ) {
      think.mkdir(destPath);
    }

    try {
      await moveFile(file, path.join(destPath, basename));
      return path.join('/static/upload', destDir, basename);
    } catch(e) {
      throw Error('FILE_UPLOAD_MOVE_ERROR');
    }
  }

  async run(file, config) {
    return await this.uploadMethod(file, config);
  }
}