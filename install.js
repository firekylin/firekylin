var inquirer = require('inquirer');
var fs = require('fs');
var mysql = require('mysql');

var configPath = './src/common/config/db.js';
var config = {};
var validator = function(type) {
  return function(string) {
    if (string.length == 0) {
      return 'Field cannot be empty';
    }
    if (type == 'hostname' && !string.match(/(?:\w+\.)+\w/)) {
      return 'Host should be a validator domain or ip';
    }
    if (type == 'port' && (!Number.isInteger(string) || string >65535)) {
      return 'Port should be a number and small than 65536';
    }
    return true;
  }
};

try {
  config = require(configPath);
} catch (e) {}

console.log('\n\nHello, welcome to FireKylin, a free and open-source content \nmanagement system (CMS), based on ThinkJS and Mysql.\n\nYou need do some config work before the program could work.\nThis utility will walk you through.\n');

inquirer.prompt([
  { type: 'input', name: 'url', message: 'Full url of your blog', default: 'http://localhost:1234', validate: validator() },
  { type: 'input', name: 'db_hostname', message: 'Database hostname', default: config.host,  validate: validator('hostname') },
  { type: 'input', name: 'db_port', message: 'Database port', default: parseInt(config.port) || 3306, validate: validator('port') },
  { type: 'input', name: 'db_database', message: 'Database name', default: config.name, validate: validator() },
  { type: 'input', name: 'db_username', message: 'Database username', default: config.user, validate: validator() },
  { type: 'password', name: 'db_password', message: 'Database password', validate: validator() },
  { type: 'prefix', name: 'db_prefix', message: 'Database table prefix', default: config.prefix, validate: validator() }
], answers => {

  var now = new Date();

  var content = `/**
 * db config
 * generate by installer
 * ${now}
 */
export default {
  type: 'mysql',
  host: '${answers.db_hostname}',
  port: '${answers.db_port}',
  name: '${answers.db_database}',
  user: '${answers.db_username}',
  pwd: '${answers.db_password}',
  prefix: '${answers.db_prefix}'
}`;

  fs.writeFileSync(configPath, content);

  /** auto import sql **/
  var sql = fs.readFileSync( './firekylin.sql', 'utf-8' ).replace(/\$\{db\_prefix\}/g, answers.db_prefix);
  var db = mysql.createConnection({
    host: answers.db_hostname,
    port: answers.db_port,
    user: answers.db_username,
    password: answers.db_password,
    database: answers.db_database,
    multipleStatements: true
  });
  db.connect();
  db.query(sql, function(err) {
    if(err) console.log(err);
  });
  db.end();
});
