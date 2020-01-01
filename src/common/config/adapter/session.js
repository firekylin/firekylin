const os = require('os');
const path = require('path');
const fileSession = require('think-session-file');

let ROOT_PATH = think.ROOT_PATH;
if(think.env === 'now') {
  ROOT_PATH = os.tmpdir();
} else if(think.env === 'pkg') {
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
    sessionPath: path.join(ROOT_PATH, 'runtime/session')
  }
};
