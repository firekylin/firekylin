'use strict';
/* eslint-disable max-len */

const CURRENT_VERSION = 3;

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
  async migrate({skipIfUninstalled = false} = {}) {
    const options = this.model('options');
    let current;
    try {
      current = await options.getOptions(true);
    } catch (error) {
      if (skipIfUninstalled && this.isMissingOptionsTable(error)) return false;
      throw error;
    }
    if (skipIfUninstalled && !current.site_url) return false;

    const version = Number(current.comment_schema_version) || 0;
    if (version < 1) await this.migrateV1();
    if (version < 2) await this.migrateV2();
    if (version < 3) await this.migrateV3();
    // Keep existing comment login tokens valid during the key rename.
    const crypto = require('crypto');
    const secret = current.jwt_secret || current.comment_jwt_secret ||
      crypto.randomBytes(32).toString('hex');
    if (!current.jwt_secret) {
      await options.updateOptions('jwt_secret', secret);
    }
    if (version < CURRENT_VERSION) {
      await options.updateOptions('comment_schema_version', String(CURRENT_VERSION));
    }
    return version < CURRENT_VERSION;
  }

  isMissingOptionsTable(error) {
    return /no such table.*options|relation .*options.*does not exist|table .*options.*doesn't exist|ER_NO_SUCH_TABLE/i.test(String(error && error.message));
  }

  async migrateV1() {
    const model = this.model('comment');
    const cfg = think.config('model');
    const type = cfg.type;
    const configuredPrefix = cfg[type] && cfg[type].prefix;
    const prefix = typeof configuredPrefix === 'string' ? configuredPrefix : 'fk_';
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
  }

  async migrateV2() {
    const cfg = think.config('model');
    const type = cfg.type;
    const configuredPrefix = cfg[type] && cfg[type].prefix;
    const prefix = typeof configuredPrefix === 'string' ? configuredPrefix : 'fk_';
    const comment = this.model('comment');
    const clause = type === 'postgresql' ? 'ADD COLUMN IF NOT EXISTS post_id INTEGER' : 'ADD COLUMN post_id INTEGER';
    try { await comment.query(`ALTER TABLE ${prefix}comment ${clause}`) } catch (error) {
      if (!/duplicate column|already exists/i.test(error.message)) throw error;
    }
    try { await comment.query(`CREATE INDEX ${prefix}comment_post_idx ON ${prefix}comment (post_id)`) } catch (error) {
      if (!/already exists|duplicate key name/i.test(error.message)) throw error;
    }

    const [comments, posts] = await Promise.all([
      comment.where({post_id: null}).field('id,url').select(),
      this.model('post').field('id,type,pathname').select()
    ]);
    const postMap = new Map(posts.map(post => [`${Number(post.type)}:${post.pathname}`, post.id]));
    for (const item of comments) {
      const match = String(item.url || '').match(/^\/(post|page)\/(.+?)(?:\.html)?\/?$/);
      if (!match) continue;
      let pathname;
      try { pathname = decodeURIComponent(match[2].replace(/\.html$/, '')) } catch (e) { continue }
      const postId = postMap.get(`${match[1] === 'page' ? 1 : 0}:${pathname}`);
      if (postId) await comment.where({id: item.id}).update({post_id: postId});
    }
  }

  async migrateV3() {
    const cfg = think.config('model');
    const type = cfg.type;
    const configuredPrefix = cfg[type] && cfg[type].prefix;
    const prefix = typeof configuredPrefix === 'string' ? configuredPrefix : 'fk_';
    const auto = type === 'postgresql' ? 'SERIAL PRIMARY KEY' : type === 'sqlite' ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY';
    const datetime = type === 'postgresql' ? 'TIMESTAMP' : 'DATETIME';
    const model = this.model('comment');
    const table = `${prefix}user_social`;
    const migrations = [
      `CREATE TABLE IF NOT EXISTS ${table} (id ${auto}, user_id INTEGER NOT NULL, provider VARCHAR(64) NOT NULL, account_id VARCHAR(255) NOT NULL, created_at ${datetime} NOT NULL)`,
      `CREATE UNIQUE INDEX ${prefix}user_social_account_idx ON ${table} (provider, account_id)`,
      `CREATE UNIQUE INDEX ${prefix}user_social_user_idx ON ${table} (user_id, provider)`
    ];
    for (const sql of migrations) {
      try { await model.query(sql) } catch (error) {
        if (!/already exists|duplicate key name/i.test(error.message)) throw error;
      }
    }
  }
};
