'use strict';

const {passwordProtectionState} = require('../post-protection-state');

function definition(config) {
  const type = config.type;
  if (!['sqlite', 'mysql', 'tidb', 'postgresql'].includes(type)) {
    throw new Error('Unsupported post search database');
  }
  const prefix = config[type]?.prefix ?? 'fk_';
  if (!/^[a-zA-Z0-9_]*$/.test(prefix)) throw new Error('Invalid database table prefix');
  return {
    table: `${prefix}post`,
    sql: `ALTER TABLE ${prefix}post ADD COLUMN is_password_protected INTEGER DEFAULT NULL`
  };
}

async function migrate({getModel, config}) {
  const {table, sql} = definition(config);
  const post = getModel('post');
  try {
    await post.query(sql);
  } catch (error) {
    if (!['ER_DUP_FIELDNAME', '42701'].includes(error.code) &&
        !/duplicate column name/i.test(error.message)) throw error;
  }

  // NULL is an uninitialized, non-searchable state. A concurrent options update
  // sets the flag atomically, so a stale backfill must never overwrite it.
  let lastId = 0;
  while (true) {
    const rows = await post.where({id: ['>', lastId], is_password_protected: null})
      .field('id,options')
      .setRelation(false)
      .order('id ASC')
      .limit(100)
      .select();
    if (!rows.length) break;
    for (const row of rows) {
      // Use the adapter directly: this derived-only migration must not invoke
      // normal write hooks or depend on an already cached pre-migration schema.
      await post.db().update({is_password_protected: passwordProtectionState(row.options)}, {
        table,
        where: {id: row.id, is_password_protected: null}
      });
    }
    lastId = rows[rows.length - 1].id;
  }
}

module.exports = {version: 1, definition, migrate};
