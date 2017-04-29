'use strict';

import fs from 'fs';

let port;
let portFile = think.ROOT_PATH + think.sep + 'port';
if(think.isFile(portFile)) {
  port = fs.readFileSync(portFile, 'utf8');
}

let host;
let hostFile = think.ROOT_PATH + think.sep + 'host';
if(think.isFile(hostFile)) {
  host = fs.readFileSync(hostFile, 'utf8');
}

/**
 * config
 */
export default {
  host: host || process.env.HOST || '0.0.0.0',
  port: port || process.env.PORT || 8360,
  resource_reg: /^(static\/|theme\/|[^\/]+\.(?!js|html|xml)\w+$)/,
  resource_headers: {
    'Cache-Control': 'public, max-age=31536000',
  }
};
