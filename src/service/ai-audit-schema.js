'use strict';
function definition(config) {
  const type = config.type;
  if (!['sqlite', 'mysql', 'tidb', 'postgresql'].includes(type)) throw new Error('Unsupported AI audit database');
  const prefix = config[type]?.prefix ?? '';
  if (!/^[a-zA-Z0-9_]*$/.test(prefix)) throw new Error('Invalid database table prefix');
  const table = `${prefix}ai_audit_log`;
  const id = type === 'postgresql' ? 'SERIAL PRIMARY KEY' : type === 'sqlite'
    ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY';
  const columns = `id ${id}, request_id VARCHAR(36) NOT NULL UNIQUE, correlation_id VARCHAR(36) NOT NULL,
    started_at BIGINT NOT NULL, actor_id INTEGER, actor_name VARCHAR(200) NOT NULL, source VARCHAR(32) NOT NULL,
    plugin_id VARCHAR(128), scenario VARCHAR(128) NOT NULL, provider VARCHAR(128), model VARCHAR(256),
    capability VARCHAR(64), duration_ms BIGINT, status VARCHAR(16) NOT NULL, error_category VARCHAR(64),
    error_message VARCHAR(256), provider_request_id VARCHAR(256), input_tokens BIGINT, output_tokens BIGINT,
    total_tokens BIGINT, cache_read_tokens BIGINT, cache_write_tokens BIGINT, reasoning_tokens BIGINT,
    content_recorded INTEGER NOT NULL, request_text TEXT, response_text TEXT,
    request_truncated INTEGER NOT NULL DEFAULT 0, response_truncated INTEGER NOT NULL DEFAULT 0`;
  return {type, table, columns};
}
async function migrate({model, config}) {
  const {type, table, columns} = definition(config);
  await model.query(`CREATE TABLE IF NOT EXISTS ${table} (${columns})`);
  for (const field of ['started_at', 'actor_id', 'scenario', 'provider', 'model', 'status', 'correlation_id']) {
    const index = `${table}_${field}_idx`;
    if (type === 'mysql' || type === 'tidb') {
      const rows = await model.query(`SHOW INDEX FROM ${table} WHERE Key_name = '${index}'`);
      if (rows.length) continue;
    }
    try {
      await model.query(`CREATE INDEX ${['sqlite', 'postgresql'].includes(type) ? 'IF NOT EXISTS ' : ''}${index} ON ${table} (${field})`);
    } catch (error) {
      // Concurrent workers may both observe a missing MySQL index.
      if (!['mysql', 'tidb'].includes(type) || error.code !== 'ER_DUP_KEYNAME') throw error;
    }
  }
}
module.exports = {definition, migrate};
