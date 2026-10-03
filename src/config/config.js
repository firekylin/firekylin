const fs = require('fs');
const path = require('path');
const {getContext} = require('../../lib/project-context');

const context = getContext();
const projectServer = (context.config && context.config.server) || {};

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
  host: host || process.env.HOST || projectServer.host || '0.0.0.0',
  port: port || process.env.PORT || projectServer.port || 8360,
  workers: 1,

  /** disable theme editor */
  DISALLOW_FILE_EDIT: process.env.DISALLOW_FILE_EDIT || false
};
