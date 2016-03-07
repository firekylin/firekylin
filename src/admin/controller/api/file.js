import Base from './base';
import fs from 'fs';
import path from 'path';
import moment from 'moment';

export default class extends Base {
  async postAction() {
    let file = this.file('file');
    if( !file ) {
      return this.fail('FILE_UPLOAD_ERROR');
    }

    let contentType = file.headers['content-type']; //check content-type if you want;

    let basename = path.basename(file.path);
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
}
