const path = require('path');
const fileCache = require('think-cache-file');

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
    cachePath: path.join(think.ROOT_PATH, 'runtime/cache'), // absoulte path is necessarily required
    pathDepth: 2,
    gcInterval: 24 * 60 * 60 * 1000 // gc interval
  }
};
