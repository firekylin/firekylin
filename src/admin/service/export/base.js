import fs from 'fs';
import JSZip from 'jszip';

export default class extends think.service.base {
  async getPosts() {
    return this.model('post').select();
  }

  generateZipFile(file, fn = new Function()) {
    let zip = new JSZip();
    fn(zip);

    return new Promise((resolve, reject) => {
      zip
        .generateNodeStream({
          type: 'nodebuffer',
          streamFiles: true
        })
        .pipe(fs.createWriteStream(file))
        .on('finish', () => resolve(file))
        .on('error', reject);
    });
  }
}
