const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {promisify} = require('node:util');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-theme-fields-'));
global.think = {Controller: class {}, THEMES_PATH: directory, promisify};
const ThemeController = require('../../src/controller/admin/api/theme');

test('theme fields survive the response control-flow exception', async t => {
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  fs.mkdirSync(path.join(directory, 'example'));
  fs.writeFileSync(path.join(directory, 'example', 'package.json'), JSON.stringify({themeFields: [{name: 'cover'}]}));
  const controller = Object.create(ThemeController.prototype);
  controller.get = () => ({theme: 'example'});
  let result;
  controller.success = data => { result = data; throw new Error('PREVENT_NEXT_PROCESS'); };
  await assert.rejects(controller.getThemeFields(), /PREVENT_NEXT_PROCESS/);
  assert.deepEqual(result, [{name: 'cover'}]);
  controller.get = () => ({theme: 'missing'});
  await assert.rejects(controller.getThemeFields(), /PREVENT_NEXT_PROCESS/);
  assert.deepEqual(result, []);
});
