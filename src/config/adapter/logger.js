const path = require('path');
const { Console, File, DateFile } = require('think-logger3');
const {getContext} = require('../../../lib/project-context');

const isDev = think.env === 'development';
const isNow = think.env === 'vercel';
const logFile = path.join(getContext().logsPath, 'app.log');

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
    filename: logFile
  },
  dateFile: {
    handle: DateFile,
    level: 'ALL',
    absolute: true,
    pattern: '-yyyy-MM-dd',
    alwaysIncludePattern: true,
    filename: logFile
  }
};
