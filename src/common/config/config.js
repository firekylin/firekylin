const fs = require('fs');
const path = require('path');

let port;
const portFile = path.join(think.ROOT_PATH, 'port');
if (think.isFile(portFile)) {
  port = fs.readFileSync(portFile, 'utf8');
}

let host;
const hostFile = path.join(think.ROOT_PATH, 'host');
if (think.isFile(hostFile)) {
  host = fs.readFileSync(hostFile, 'utf8');
}

module.exports = {
  host: host || process.env.HOST || '0.0.0.0',
  port: port || process.env.PORT || 8360,

  /** disable theme editor */
  DISALLOW_FILE_EDIT: process.env.DISALLOW_FILE_EDIT || false
};
