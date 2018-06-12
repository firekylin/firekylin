const fs = require('fs');
const JSZip = require('jszip');

module.exports = class extends think.Service {
  async getPosts() {
    return this.model('post', null, 'admin').select();
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
