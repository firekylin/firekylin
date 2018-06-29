const mysql = require('think-model-mysql');

const isDev = think.env === 'development';
let msc = {
  host: process.env.FK_DB_HOST,
  port: process.env.FK_DB_PORT,
  database: process.env.FK_DB_DATABASE,
  user: process.env.FK_DB_USER,
  password: process.env.FK_DB_PASSWORD,
  prefix: process.env.FK_DB_PREFIX,
  encoding: process.env.FK_DB_ENCODING
};
try {
  const dbConfig = require('../db.js');
  msc = (dbConfig.default ? dbConfig.default : dbConfig).adapter.mysql;
} catch (e) {
  //eslint-disable-line
}

module.exports = {
  type: process.env.FK_DB_MODE || 'mysql',
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
