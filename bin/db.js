'use strict';
/**
* db config
* @type {Object}
*/
export default {
  type: 'mysql',
  log_sql: true,
  log_connect: true,
  adapter: {
    mysql: {
      host: '127.0.0.1',
      port: '3306',
      database: 'firekylin',
      user: 'root',
      password: 'root',
      prefix: 'fk_',
      encoding: 'utf8'
    },
    mongo: {

    }
  }
};
