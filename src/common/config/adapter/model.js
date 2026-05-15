const mysql = require('think-model-mysql');
const pgsql = require('think-model-postgresql');
const sqlite = require('think-model-sqlite');

const isDev = think.env === 'development';
let msc = {
  host: process.env.FK_DB_HOST,
  port: process.env.FK_DB_PORT,
  database: process.env.FK_DB_DATABASE,
  user: process.env.FK_DB_USER,
  password: process.env.FK_DB_PASSWORD,
  prefix: process.env.FK_DB_PREFIX,
  encoding: process.env.FK_DB_ENCODING,
  path: process.env.FK_DB_PATH
};
let type = process.env.FK_DB_MODE || 'mysql';
try {
  let dbConfig = require('../db'); // eslint-disable-line import/extensions
  dbConfig = dbConfig.default || dbConfig;
  if (!dbConfig.type) {
    throw new Error();
  }

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
    connectionLimit: 1
  },
  sqlite: {
    handle: sqlite,
    path: msc.path,
    database: msc.database,
    prefix: msc.prefix
  }
};
