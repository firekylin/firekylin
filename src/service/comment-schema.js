'use strict';
/* eslint-disable max-len */

let ready;

function statements(type) {
  const auto = type === 'postgresql' ? 'SERIAL PRIMARY KEY' : type === 'sqlite' ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY';
  const datetime = type === 'postgresql' ? 'TIMESTAMP' : 'DATETIME';
  return [
    `CREATE TABLE IF NOT EXISTS %COMMENT% (id ${auto}, comment TEXT NOT NULL, url VARCHAR(191) NOT NULL, mail VARCHAR(255), nick VARCHAR(255), link VARCHAR(512), pid VARCHAR(64), rid VARCHAR(64), ua TEXT, ip VARCHAR(64), user_id VARCHAR(64), status VARCHAR(32) NOT NULL DEFAULT 'approved', sticky INTEGER NOT NULL DEFAULT 0, \`like\` INTEGER NOT NULL DEFAULT 0, inserted_at ${datetime} NOT NULL, created_at ${datetime} NOT NULL, updated_at ${datetime} NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS %COUNTER% (id ${auto}, url VARCHAR(191) NOT NULL, time INTEGER NOT NULL DEFAULT 0, reaction0 INTEGER NOT NULL DEFAULT 0, reaction1 INTEGER NOT NULL DEFAULT 0, reaction2 INTEGER NOT NULL DEFAULT 0, reaction3 INTEGER NOT NULL DEFAULT 0, reaction4 INTEGER NOT NULL DEFAULT 0, reaction5 INTEGER NOT NULL DEFAULT 0, created_at ${datetime} NOT NULL, updated_at ${datetime} NOT NULL)`,
    'CREATE INDEX %COMMENT_URL_IDX% ON %COMMENT% (url)',
    'CREATE INDEX %COMMENT_STATUS_IDX% ON %COMMENT% (status)',
    'CREATE UNIQUE INDEX %COUNTER_URL_IDX% ON %COUNTER% (url)'
  ];
}

module.exports = class extends think.Service {
  ensure() {
    if (ready) return ready;
    ready = this.run().catch(error => { ready = null; throw error });
    return ready;
  }

  async run() {
    const model = this.model('comment');
    const cfg = think.config('model');
    const type = cfg.type;
    const prefix = (cfg[type] && cfg[type].prefix) || 'fk_';
    const names = {
      '%COMMENT%': `${prefix}comment`,
      '%COUNTER%': `${prefix}counter`,
      '%COMMENT_URL_IDX%': `${prefix}comment_url_idx`,
      '%COMMENT_STATUS_IDX%': `${prefix}comment_status_idx`,
      '%COUNTER_URL_IDX%': `${prefix}counter_url_idx`
    };
    for (let sql of statements(type)) {
      for (const [token, name] of Object.entries(names)) sql = sql.split(token).join(name);
      if (type === 'postgresql') sql = sql.replace(/`like`/g, '"like"');
      try { await model.query(sql) } catch (error) {
        if (!/already exists|duplicate key name|duplicate column/i.test(error.message)) throw error;
      }
    }
    const userColumns = type === 'postgresql'
      ? ['ADD COLUMN IF NOT EXISTS url VARCHAR(512)', 'ADD COLUMN IF NOT EXISTS avatar VARCHAR(512)', 'ADD COLUMN IF NOT EXISTS comment_label VARCHAR(255)', 'ADD COLUMN IF NOT EXISTS comment_2fa VARCHAR(64)']
      : ['ADD COLUMN url VARCHAR(512)', 'ADD COLUMN avatar VARCHAR(512)', 'ADD COLUMN comment_label VARCHAR(255)', 'ADD COLUMN comment_2fa VARCHAR(64)'];
    for (const clause of userColumns) {
      try { await model.query(`ALTER TABLE ${prefix}user ${clause}`) } catch (error) {
        if (!/duplicate column|already exists/i.test(error.message)) throw error;
      }
    }
    const options = this.model('options');
    const current = await options.getOptions();
    if (!current.comment_jwt_secret) {
      const crypto = require('crypto');
      await options.updateOptions('comment_jwt_secret', crypto.randomBytes(32).toString('hex'));
    }
    await options.updateOptions('comment_schema_version', '1');
  }
};
