'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {createRequire} = require('module');
const {PasswordHash} = require('phpass');

const coreTables = ['cate', 'post', 'post_cate', 'post_tag', 'tag', 'user'];
const welcomeMarkdown = '这是程序自动发布的文章。如果您看到这篇文章，表示您的 Blog 已经安装成功！';

function adapterDependency(adapter, dependency) {
  return createRequire(require.resolve(adapter))(dependency);
}

function mysqlDriver() {
  const adapterRequire = createRequire(require.resolve('think-model-mysql'));
  return createRequire(adapterRequire.resolve('think-mysql'))('mysql');
}

function hashAdminPassword(salt, password) {
  const loginPassword = crypto.createHash('md5')
    .update(salt + password)
    .digest('hex');
  return new PasswordHash().hashPassword(loginPassword);
}

function safeIdentifier(value, label) {
  if (!/^[A-Za-z0-9_$-]+$/.test(value || '')) throw new Error(`${label} 只能包含字母、数字、_、$ 或 -`);
  return value;
}

function splitSql(content, type) {
  if (type === 'mysql') {
    content = content.split('\n').filter(line => !/^\s*(#|LOCK|UNLOCK)/.test(line)).join('\n');
    content = content.replace(/\/\*[^]*?\*\//g, '');
  }
  return content.split(';').map(item => item.trim()).filter(Boolean);
}

async function createDatabase(config) {
  if (config.type === 'sqlite') return;
  const database = safeIdentifier(config.database, '数据库名称');
  if (config.type === 'mysql') {
    const mysql = mysqlDriver();
    const connection = mysql.createConnection({...config, database: undefined});
    await new Promise((resolve, reject) => connection.query(`CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(database)}`, err => err ? reject(err) : resolve()));
    connection.end();
    return;
  }
  if (config.type === 'postgresql') {
    const {Client} = adapterDependency('think-model-postgresql', 'pg');
    const client = new Client({...config, database: config.maintenanceDatabase || 'postgres'});
    await client.connect();
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (!exists.rowCount) await client.query(`CREATE DATABASE "${database.replace(/"/g, '""')}"`);
    await client.end();
  }
}

async function openDatabase(config, projectPath) {
  if (config.type === 'sqlite') {
    const BetterSqlite3 = adapterDependency('think-model-sqlite', 'better-sqlite3');
    const filename = path.resolve(projectPath, config.path || 'data/firekylin.sqlite');
    fs.mkdirSync(path.dirname(filename), {recursive: true});
    const db = new BetterSqlite3(filename);
    return {
      query(sql, params = []) { return Promise.resolve(db.prepare(sql).all(...params)) },
      execute(sql, params = []) { return Promise.resolve(db.prepare(sql).run(...params)) },
      close() { db.close() }
    };
  }
  if (config.type === 'mysql') {
    const mysql = mysqlDriver();
    const connection = mysql.createConnection(config);
    const run = (sql, params = []) => new Promise((resolve, reject) => {
      connection.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
    });
    await run('SELECT 1');
    return {query: run, execute: run, close() { connection.end() }};
  }
  const {Client} = adapterDependency('think-model-postgresql', 'pg');
  const client = new Client({...config, database: config.database});
  await client.connect();
  return {
    query: async(sql, params = []) => (await client.query(sql, params)).rows,
    execute: async(sql, params = []) => client.query(sql, params),
    close() { return client.end() }
  };
}

function placeholders(type, count, offset = 0) {
  if (type === 'postgresql') return Array.from({length: count}, (_, i) => `$${i + 1 + offset}`).join(', ');
  return Array(count).fill('?').join(', ');
}

async function tableNames(db, config) {
  if (config.type === 'sqlite') {
    return (await db.query('SELECT name FROM sqlite_master WHERE type=\'table\''))
      .map(row => row.name);
  }
  if (config.type === 'mysql') {
    const sql = 'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?';
    return (await db.query(sql, [config.database])).map(row => row.TABLE_NAME);
  }
  const sql = 'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'';
  return (await db.query(sql)).map(row => row.table_name);
}

async function setOption(db, config, key, value) {
  const table = `${config.prefix || 'fk_'}options`;
  const p = placeholders(config.type, 2);
  const keyPlaceholder = config.type === 'postgresql' ? '$1' : '?';
  const rows = await db.query(`SELECT key FROM ${table} WHERE key = ${keyPlaceholder}`, [key]);
  if (rows.length) {
    const updatePlaceholders = config.type === 'postgresql' ? ['$1', '$2'] : ['?', '?'];
    await db.execute(
      `UPDATE ${table} SET value = ${updatePlaceholders[0]} WHERE key = ${updatePlaceholders[1]}`,
      [String(value), key]
    );
  } else {
    await db.execute(`INSERT INTO ${table} (key, value) VALUES (${p})`, [key, String(value)]);
  }
}

async function initialize(projectPath, projectConfig, site) {
  const config = projectConfig.database;
  if (!['mysql', 'postgresql', 'sqlite'].includes(config.type)) throw new Error(`不支持的数据库类型：${config.type}`);
  if (!/^[A-Za-z0-9_]*$/.test(config.prefix || '')) throw new Error('数据表前缀只能包含字母、数字和下划线');
  try {
    await createDatabase(config);
  } catch (err) {
    err.message = `无法自动创建数据库，请确认账号具有建库权限或手工创建后重试：${err.message}`;
    throw err;
  }
  const db = await openDatabase(config, projectPath);
  const transactional = config.type !== 'mysql';
  try {
    if (transactional) await db.execute('BEGIN');
    const prefix = config.prefix || 'fk_';
    const names = await tableNames(db, config);
    const installed = coreTables.every(name => names.includes(prefix + name));
    if (!installed) {
      const sqlFiles = {
        mysql: 'firekylin.sql',
        postgresql: 'firekylin.pgsql',
        sqlite: 'firekylin.sqlite.sql'
      };
      const sqlFile = sqlFiles[config.type];
      const sql = fs.readFileSync(path.join(__dirname, '..', sqlFile), 'utf8').replace(/fk_/g, prefix);
      for (const statement of splitSql(sql, config.type)) await db.execute(statement);
    }

    const userTable = `${prefix}user`;
    const optionsTable = `${prefix}options`;
    const valuePlaceholder = config.type === 'postgresql' ? '$1' : '?';
    const users = await db.query(
      `SELECT id FROM ${userTable} WHERE name = ${valuePlaceholder}`,
      [site.username]
    );
    const saltRows = await db.query(
      `SELECT value FROM ${optionsTable} WHERE key = ${valuePlaceholder}`,
      ['password_salt']
    );
    const salt = users.length && saltRows.length
      ? saltRows[0].value
      : crypto.randomBytes(16).toString('hex');
    const options = {
      title: site.title,
      site_url: site.siteUrl,
      password_salt: salt,
      logo_url: '/static/img/firekylin.jpg',
      theme: 'firekylin',
      navigation: JSON.stringify([
        {label: '首页', url: '/', option: 'home'},
        {label: '归档', url: '/archives/', option: 'archive'},
        {label: '分类', url: '/categories', option: 'category'},
        {label: '标签', url: '/tags', option: 'tags'},
        {label: '关于', url: '/about', option: 'user'},
        {label: '友链', url: '/links', option: 'link'}
      ])
    };
    for (const [key, value] of Object.entries(options)) await setOption(db, config, key, value);

    if (!users.length) {
      const now = new Date().toISOString().slice(0, 19)
        .replace('T', ' ');
      const password = hashAdminPassword(salt, site.password);
      await db.execute(`INSERT INTO ${userTable} (name, email, password, type, status, create_time, create_ip, last_login_time, last_login_ip) VALUES (${placeholders(config.type, 9)})`, [site.username, site.email, password, 1, 1, now, '127.0.0.1', now, '127.0.0.1']);
    }

    const postTable = `${prefix}post`;
    const postKey = config.type === 'postgresql' ? '$1' : '?';
    const posts = await db.query(`SELECT id FROM ${postTable} WHERE pathname = ${postKey}`, ['hello-world-via-firekylin']);
    if (!posts.length) {
      const now = new Date().toISOString().slice(0, 19)
        .replace('T', ' ');
      await db.execute(`INSERT INTO ${postTable} (user_id, type, status, title, pathname, summary, markdown_content, content, allow_comment, create_time, update_time, is_public, comment_num) VALUES (${placeholders(config.type, 13)})`, [1, 0, 3, '欢迎使用 Firekylin', 'hello-world-via-firekylin', welcomeMarkdown, welcomeMarkdown, `<p>${welcomeMarkdown}</p>`, 1, now, now, 1, 0]);
    }
    if (transactional) await db.execute('COMMIT');
  } catch (err) {
    if (transactional) await db.execute('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await db.close();
  }
}

module.exports = {hashAdminPassword, initialize, safeIdentifier, splitSql};
