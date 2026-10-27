const fs = require('fs');
const JSZip = require('jszip');

module.exports = class extends think.Service {
  async getPosts() {
    // 导出格式只描述文章（type=0）：页面（type=1）与附件（type=2）
    // 混进 zip 会生成错误的 front matter / 无意义的文件。
    return this.model('post').where({type: 0}).select();
  }

  generateZipFile(file, fn = new Function()) {
    const zip = new JSZip();
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
};
