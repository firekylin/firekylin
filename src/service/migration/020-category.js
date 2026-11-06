'use strict';

async function migrate({getModel, config}) {
  const options = getModel('options');
  const current = await options.getOptions(true);
  if (Number(current.category_schema_version) >= 1) return false;

  const type = config.type;
  const configuredPrefix = config[type] && config[type].prefix;
  const prefix = typeof configuredPrefix === 'string' ? configuredPrefix : 'fk_';
  const clause = type === 'postgresql'
    ? 'ADD COLUMN IF NOT EXISTS description TEXT'
    : 'ADD COLUMN description TEXT';
  try {
    await getModel('cate').query(`ALTER TABLE ${prefix}cate ${clause}`);
  } catch (error) {
    if (!/duplicate column|already exists/i.test(error.message)) throw error;
  }
  await options.updateOptions('category_schema_version', '1');
  return true;
}

module.exports = {version: 1, migrate};
