import Base from './base';
import fs from 'fs';
import path from 'path';
import moment from 'moment';
import request from 'request';

export default class extends Base {
  async postAction() {
    if( this.post('fileUrl') ) {
      return this.getFileByUrl(this.post('fileUrl'));
    }
    let file = this.file('file');
    if( !file ) {
      if( this.post('fileUrl') ) {
        return this.getFileByUrl( this.post('fileUrl') );
      }
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

  async getFileByUrl(url) {
    let fn = think.promisify(request.get);
    let result = await fn({
      url,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) Chrome/47.0.2526.111 Safari/537.36"
      },
      encoding: 'binary'
    });
    let writeFile = think.promisify(fs.writeFile, fs);
    let destDir = moment(new Date).format('YYYYMM');
    let basename = moment(new Date).format('x') + '.jpg';
    let destPath = path.join( think.UPLOAD_PATH, destDir );
    if( !think.isDir(destPath) ) {
      think.mkdir(destPath);
    }
    result = await writeFile( path.join(destPath, basename), result.body, 'binary');
    return this.success(path.join('/static/upload', destDir, basename));
  }
}
