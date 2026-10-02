const os = require('os');
const path = require('path');
const fileCache = require('think-cache-file');
const {getContext} = require('../../../../lib/project-context');

let ROOT_PATH = getContext().runtimePath;
if (think.env === 'vercel') {
  ROOT_PATH = os.tmpdir();
} else if (think.env === 'pkg') {
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
    cachePath: path.join(ROOT_PATH, 'cache'), // absoulte path is necessarily required
    pathDepth: 2,
    gcInterval: 24 * 60 * 60 * 1000 // gc interval
  }
};
