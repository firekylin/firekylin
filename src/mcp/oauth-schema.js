'use strict';

function sqlFor(type, prefix) {
  const id = type === 'postgresql' ? 'SERIAL PRIMARY KEY' :
    type === 'sqlite' ? 'INTEGER PRIMARY KEY AUTOINCREMENT' :
      'INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY';
  return [
    `CREATE TABLE IF NOT EXISTS ${prefix}mcp_oauth_client (id ${id}, client_id VARCHAR(128) NOT NULL UNIQUE, name VARCHAR(100) NOT NULL, redirect_uris TEXT NOT NULL, created_at BIGINT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS ${prefix}mcp_oauth_grant (id ${id}, token_hash VARCHAR(64) NOT NULL UNIQUE, kind VARCHAR(16) NOT NULL, user_id INTEGER NOT NULL, client_id VARCHAR(128) NOT NULL, scopes TEXT NOT NULL, resource VARCHAR(512) NOT NULL, challenge VARCHAR(128) NOT NULL, parent_hash VARCHAR(64) NOT NULL, expires_at BIGINT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0, created_at BIGINT NOT NULL)`
  ];
}

async function migrateOAuthModels({model, config}) {
  const type = config.type;
  if (!['sqlite', 'mysql', 'postgresql'].includes(type)) throw new Error('Unsupported database backend for OAuth');
  const prefix = ((config[type] || {}).prefix || 'fk_');
  if (!/^[a-zA-Z0-9_]*$/.test(prefix)) throw new Error('Invalid database table prefix');
  for (const sql of sqlFor(type, prefix)) await model.query(sql);
}

module.exports = {sqlFor, migrateOAuthModels};
