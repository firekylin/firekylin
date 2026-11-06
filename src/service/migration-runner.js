'use strict';
const fs = require('fs');
const path = require('path');

// Migration modules are ordered by filename. Only successful versions are marked.
async function migrate({
  runtime = think, directory = path.join(__dirname, 'migration'), skipIfUninstalled = true
} = {}) {
  const options = runtime.model('options');
  let current;
  try { current = await options.getOptions(true) } catch (error) {
    if (skipIfUninstalled && /no such table.*options|relation .*options.*does not exist|table .*options.*doesn't exist|ER_NO_SUCH_TABLE/i.test(error.message)) return;
    throw error;
  }
  if (!current.site_url) {
    if (skipIfUninstalled) return;
    throw new Error('Site options must be initialized before migrations');
  }
  for (const file of fs.readdirSync(directory).filter(file => file.endsWith('.js')).sort()) {
    const migration = require(path.join(directory, file));
    const key = `migration_${path.basename(file, '.js')}`;
    if (Number(current[key]) >= migration.version) continue;
    try {
      await migration.migrate({model: runtime.model('user'), getModel: name => runtime.model(name),
        config: runtime.config('model')});
      await options.updateOptions(key, String(migration.version));
    } catch (error) {
      if (!migration.optional) throw error;
      runtime.logger.error(`[migration] ${file} failed`);
    }
  }
}
module.exports = {migrate};
