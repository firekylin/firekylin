const path = require('path');
const { Console, File, DateFile } = require('think-logger3');

const isDev = think.env === 'development';
const isNow = think.env === 'now';
const isPkg = think.env === 'pkg';

module.exports = {
  type: isDev || isNow ? 'console' : 'dateFile',
  console: {
    handle: Console
  },
  file: {
    handle: File,
    backups: 10, // max chunk number
    absolute: true,
    maxLogSize: 50 * 1024, // 50M
    filename: path.join(isPkg ? process.cwd() : think.ROOT_PATH, 'logs/app.log')
  },
  dateFile: {
    handle: DateFile,
    level: 'ALL',
    absolute: true,
    pattern: '-yyyy-MM-dd',
    alwaysIncludePattern: true,
    filename: path.join(isPkg ? process.cwd() : think.ROOT_PATH, 'logs/app.log')
  }
};
