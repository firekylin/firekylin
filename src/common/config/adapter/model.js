const mysql = require('think-model-mysql');
const pgsql = require('think-model-postgresql');

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
let type = process.env.FK_DB_MODE || 'mysql';
try {
  let dbConfig = require('../db.js');
  dbConfig = dbConfig.default || dbConfig;

  type = dbConfig.type;
  msc = dbConfig.adapter[type];
} catch (e) {
  //eslint-disable-line
}

module.exports = {
  type,
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
  },
  postgresql: {
    handle: pgsql,
    user: msc.user,
    password: msc.password,
    database: msc.database,
    host: msc.host,
    port: msc.port,
    prefix: msc.prefix,
    connectionLimit: 1,
  }
};
