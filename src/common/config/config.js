const fs = require('fs');

let port;
const portFile = think.ROOT_PATH + think.sep + 'port';
if (think.isFile(portFile)) {
  port = fs.readFileSync(portFile, 'utf8');
}

let host;
const hostFile = think.ROOT_PATH + think.sep + 'host';
if (think.isFile(hostFile)) {
  host = fs.readFileSync(hostFile, 'utf8');
}

module.exports = {
  host: host || process.env.HOST || '0.0.0.0',
  port: port || process.env.PORT || 8360,
  resource_reg: /^(static\/|theme\/|[^/]+\.(?!js|html|xml)\w+$)/,
  resource_headers: {
    'Cache-Control': 'public, max-age=31536000'
  }
};
