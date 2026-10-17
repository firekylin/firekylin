'use strict';

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
    if (Number(current.category_schema_version) >= 1) return false;

    const cfg = think.config('model');
    const type = cfg.type;
    const configuredPrefix = cfg[type] && cfg[type].prefix;
    const prefix = typeof configuredPrefix === 'string' ? configuredPrefix : 'fk_';
    const clause = type === 'postgresql'
      ? 'ADD COLUMN IF NOT EXISTS description TEXT'
      : 'ADD COLUMN description TEXT';
    try {
      await this.model('cate').query(`ALTER TABLE ${prefix}cate ${clause}`);
    } catch (error) {
      if (!/duplicate column|already exists/i.test(error.message)) throw error;
    }
    await options.updateOptions('category_schema_version', '1');
    return true;
  }

  isMissingOptionsTable(error) {
    return /no such table.*options|relation .*options.*does not exist|table .*options.*doesn't exist|ER_NO_SUCH_TABLE/i.test(String(error && error.message));
  }
};
