const https = require('https');
const FormData = require('form-data');
const Base = require('./base');

module.exports = class extends Base {
  // 导入方法
  async uploadMethod(filename, config) {
    var form = new FormData();
    var buffer = require('fs').readFileSync(filename);
    form.append('smfile', buffer, Object.assign({
      filename: filename.split('/')[filename.split('/').length - 1],
      contentType: 'image/png'
    }));

    if (buffer.length >= 1024 * 1024 * 5) {
      // config 暂时没用,出错时抛出
      return Promise.reject(config);
    }

    return new Promise((resolve, reject) => {
      var request = https.request({
        method: 'POST',
        hostname: 'sm.ms',
        path: '/api/upload',
        headers: Object.assign({}, form.getHeaders(), {
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) Chrome/47.0.2526.111 Safari/537.36',
        })
      }, (res) => {
        var all = '';
        res.on('data', chunk => all += chunk)
        res.on('end', () => {
          try {
            all = JSON.parse(all);
            resolve(all.code === 'success' && all.data.url);
          } catch (e) {
            reject(false);
          }
        })
      }).on('error', () => reject(false));
      form.pipe(request);
    });
  }

  // 执行方法
  async run(file, config) {
    return await this.upload(file, config);
  }
}

