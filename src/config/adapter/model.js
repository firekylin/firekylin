const mysql = require('think-model-mysql2');
const pgsql = require('think-model-postgresql');
const sqlite = require('think-model-sqlite');
const {getContext} = require('../../../lib/project-context');

const isDev = think.env === 'development';
let msc = {
  host: process.env.FK_DB_HOST,
  port: process.env.FK_DB_PORT,
  database: process.env.FK_DB_DATABASE,
  user: process.env.FK_DB_USER,
  password: process.env.FK_DB_PASSWORD,
  prefix: process.env.FK_DB_PREFIX,
  encoding: process.env.FK_DB_ENCODING,
  path: process.env.FK_DB_PATH,
  ssl: process.env.FK_DB_SSL,
};
let type = process.env.FK_DB_MODE || 'mysql';

/**
 * 读取 legacy 项目里的 src/config/db.js。
 * 返回 null 表示“没有本地 db.js 或它是空文件”（Docker entrypoint 会 touch 一个
 * 空文件），此时回落到 FK_DB_* 环境变量；其余错误（语法错误、缺少 adapter）
 * 必须抛出，不能被静默吞掉后降级成 mysql。
 */
function legacyDatabase() {
  let dbConfig;
  try {
    // src/config/db.js 由安装流程生成、不进版本库，因此这里不带扩展名。
    dbConfig = require('../db'); // eslint-disable-line import/extensions
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return null;
    throw error;
  }
  dbConfig = dbConfig && (dbConfig.default || dbConfig);
  if (!dbConfig || !dbConfig.type) return null;
  const adapterConfig = (dbConfig.adapter || {})[dbConfig.type];
  if (!adapterConfig) throw new Error(`src/config/db.js 缺少 adapter.${dbConfig.type} 配置`);
  return {type: dbConfig.type, config: adapterConfig};
}

const context = getContext();
if (!context.legacy) {
  type = context.config.database.type;
  msc = context.config.database;
} else {
  const legacy = legacyDatabase();
  if (legacy) {
    type = legacy.type;
    msc = legacy.config;
  }
}
const mysqlEncoding = msc.encoding || 'utf8mb4';

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
    encoding: mysqlEncoding
  },
  tidb: {
    handle: mysql,
    dateStrings: true,
    host: msc.host,
    port: msc.port,
    database: msc.database,
    user: msc.user,
    password: msc.password,
    prefix: msc.prefix,
    encoding: mysqlEncoding,
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true
    }
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
    ssl: msc.ssl ? { rejectUnauthorized: false } : false,
  },
  sqlite: {
    handle: sqlite,
    path: process.env.FIREKYLIN_PROJECT_PATH && msc.path
      ? require('path').dirname(require('path').resolve(process.env.FIREKYLIN_PROJECT_PATH, msc.path))
      : msc.path,
    database: process.env.FIREKYLIN_PROJECT_PATH && msc.path
      ? require('path').basename(msc.path, '.sqlite')
      : msc.database,
    prefix: msc.prefix
  }
};
