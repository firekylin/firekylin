const os = require('os');
const path = require('path');
const fileSession = require('think-session-file');
const {getContext} = require('../../../lib/project-context');

let ROOT_PATH = getContext().runtimePath;
if (think.env === 'vercel') {
  ROOT_PATH = os.tmpdir();
} else if (think.env === 'pkg') {
  ROOT_PATH = think.RUNTIME_PATH;
}
/**
 * session adapter config
 * @type {Object}
 */
module.exports = {
  type: 'file',
  common: {
    secret: '!N71PV5J',
    timeout: 24 * 3600,
    cookie: {
      name: 'thinkjs',
      length: 32,
      httponly: true
      // keys: ['werwer', 'werwer'],
      // signed: true
    }
  },
  file: {
    handle: fileSession,
    sessionPath: path.join(ROOT_PATH, 'session')
  }
};
