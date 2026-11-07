'use strict';
function definition(config) {
  const type = config.type;
  if (!['sqlite', 'mysql', 'tidb', 'postgresql'].includes(type)) throw new Error('Unsupported chat database');
  const prefix = config[type]?.prefix || '';
  if (!/^[a-zA-Z0-9_]*$/.test(prefix)) throw new Error('Invalid database prefix');
  const large = ['mysql', 'tidb'].includes(type) ? 'MEDIUMTEXT' : 'TEXT';
  return Object.entries({
    chat_session: `id VARCHAR(36) PRIMARY KEY, user_id INTEGER NOT NULL, title VARCHAR(200) NOT NULL,
      provider VARCHAR(128), model VARCHAR(256), active_run VARCHAR(36), updated_at BIGINT NOT NULL`,
    chat_message: `id VARCHAR(36) PRIMARY KEY, session_id VARCHAR(36) NOT NULL, created_at BIGINT NOT NULL,
      payload ${large} NOT NULL`,
    chat_run: `id VARCHAR(36) PRIMARY KEY, session_id VARCHAR(36) NOT NULL, status VARCHAR(32) NOT NULL,
      expires_at BIGINT NOT NULL, created_at BIGINT NOT NULL, request_key VARCHAR(100) NOT NULL,
      UNIQUE(session_id, request_key)`,
    chat_action: `id VARCHAR(36) PRIMARY KEY, session_id VARCHAR(36) NOT NULL, run_id VARCHAR(36) NOT NULL,
      status VARCHAR(32) NOT NULL, expires_at BIGINT NOT NULL, payload ${large} NOT NULL`
  }).map(([name, columns]) => ({table: prefix + name, columns}));
}
async function migrate({model, config}) {
  for (const {table, columns} of definition(config)) await model.query(`CREATE TABLE IF NOT EXISTS ${table} (${columns})`);
}
module.exports = {version: 1, definition, migrate};
