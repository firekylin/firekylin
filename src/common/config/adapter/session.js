const path = require('path');
const fileSession = require('think-session-file');
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
    sessionPath: path.join(think.ROOT_PATH, 'runtime/session')
  }
};
