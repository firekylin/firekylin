import path from 'path';
import fs from 'fs';
import request from 'request';
import Base from './base';

request.defaults({
  strictSSL: false,
  rejectUnauthorized: false
});

const getFileContent = think.promisify(request.get, request);
const putFileContent = think.promisify(fs.writeFile, fs);

export default class extends Base {
  async uploadMethod(url, {name}) {
    let result = await getFileContent({
      url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) Chrome/47.0.2526.111 Safari/537.36'
      },
      strictSSL: false,
      timeout: 1000,
      encoding: 'binary'
    }).catch(() => { throw Error('UPLOAD_URL_ERROR'); });

    if(result.headers['content-type'].indexOf('image') === -1) {
      throw Error('UPLOAD_TYPE_ERROR');
    }

    let destDir = this.formatNow();
    let basename = (name ? name : think.md5(result.body)) + path.extname(url);
    let destPath = path.join(think.UPLOAD_PATH, destDir);

    if(!think.isDir(destPath)) {
      think.mkdir(destPath);
    }

    result = await putFileContent(path.join(destPath, basename), result.body, 'binary');
    return path.join(think.UPLOAD_PATH.replace(think.RESOURCE_PATH, ''), destDir, basename);
  }

  async run(file, config) {
    return await this.uploadMethod(file, config);
  }
}
