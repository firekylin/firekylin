'use strict';

async function migrate({getModel, config}) {
  const type = config.type;
  if (!['sqlite', 'mysql', 'tidb', 'postgresql'].includes(type)) throw new Error('Unsupported desktop database');
  const prefix = (config[type] || {}).prefix ?? 'fk_';
  if (!/^[a-zA-Z0-9_]*$/.test(prefix)) throw new Error('Invalid table prefix');
  try {
    await getModel('post').query(`ALTER TABLE ${prefix}post ADD COLUMN revision INTEGER NOT NULL DEFAULT 1`);
  } catch (error) {
    if (!/duplicate column|already exists/i.test(error.message)) throw error;
  }
  const resultType = ['mysql', 'tidb'].includes(type) ? 'LONGTEXT' : 'TEXT';
  await getModel('post').query(`CREATE TABLE IF NOT EXISTS ${prefix}desktop_operation (` +
    'operation_key VARCHAR(64) PRIMARY KEY, user_id INTEGER NOT NULL, request_hash VARCHAR(64) NOT NULL, ' +
    `state VARCHAR(16) NOT NULL, result ${resultType} NOT NULL, created_at BIGINT NOT NULL)`);
  // Fail visibly on legacy duplicates; never rename or delete existing content.
  const duplicates = await getModel('post').query(`SELECT pathname FROM ${prefix}post ` +
    'WHERE pathname IS NOT NULL GROUP BY pathname HAVING COUNT(*) > 1 LIMIT 1');
  if (duplicates.length) {
    throw new Error('Desktop API requires unique post pathnames; resolve duplicates in the web admin');
  }
  try {
    await getModel('post').query(`CREATE UNIQUE INDEX ${prefix}post_pathname_unique ON ${prefix}post (pathname)`);
  } catch (error) {
    if (!/already exists|duplicate key name/i.test(error.message)) throw error;
  }
}

module.exports = {version: 1, migrate};
