const os = require('os');
const path = require('path');
const fileCache = require('think-cache-file');

let ROOT_PATH = think.ROOT_PATH;
if(think.env === 'now') {
  ROOT_PATH = os.tmpdir();
} else if(think.env === 'pkg') {
  ROOT_PATH = think.RUNTIME_PATH;
}
/**
 * cache adapter config
 * @type {Object}
 */
module.exports = {
  type: 'file',
  common: {
    timeout: 24 * 60 * 60 * 1000 // millisecond
  },
  file: {
    handle: fileCache,
    cachePath: path.join(ROOT_PATH, 'runtime/cache'), // absoulte path is necessarily required
    pathDepth: 2,
    gcInterval: 24 * 60 * 60 * 1000 // gc interval
  }
};
