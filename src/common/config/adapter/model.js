const mysql = require('think-model-mysql');

const isDev = think.env === 'development';
let msc = {};
try {
  const dbConfig = require('../db.js');
  msc = (dbConfig.default ? dbConfig.default : dbConfig).adapter.mysql;
} catch (e) {
  //eslint-disable-line
}

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
    user: msc.user,
    password: msc.password,
    prefix: msc.prefix,
    encoding: msc.encoding
  }
};
