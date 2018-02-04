const mysql = require('think-model-mysql');
try {
  const dbConfig = require('../db.js');
  const isDev = think.env === 'development';
  const msc = (dbConfig.default ? dbConfig.default : dbConfig).adapter.mysql;
  module.exports = {
    type: 'mysql',
    common: {
      logConnect: isDev,
      logSql: isDev,
      logger: msg => think.logger.info(msg)
    },
    mysql: {
      handle: mysql,
      dateStrings: true,
      host: msc.host,
      port: msc.port,
      database: msc.database,
      user: msc.root,
      password: msc.root,
      prefix: msc.prefix,
      encoding: msc.encoding
    }
  };
} catch (e) {
  module.exports = {};
}
