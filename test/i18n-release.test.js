const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const {spawnSync} = require('node:child_process');
const {Eta} = createRequire(require.resolve('think-view-eta'))('eta');
const {createSnapshot} = require('../src/service/i18n');
const {themeTranslator} = require('../src/service/i18n-theme');

test('boot locale data cannot terminate its script container', async () => {
  const source = fs.readFileSync(path.resolve('view/admin.eta'), 'utf8');
  const output = await new Eta({varName: 'firekylin'}).renderStringAsync(source, {
    options: {title: '</script><script>alert(1)</script>', locale: 'en-US'},
    userInfo: {},
    publicCaptcha: {},
    adminAssets: {styles: [], script: '/admin.js'},
    think: {config: () => false}
  });
  const boot = output.slice(output.indexOf('window.SysConfig'), output.indexOf('</script>'));
  assert.doesNotMatch(boot, /<script|<\/script/i);
  assert.match(boot, /\\u003c\/script>/);
});

test('separate processes resolve locale independently with bundled resources', () => {
  for (const locale of ['en-US', 'zh-CN', 'en-US']) {
    const child = spawnSync(process.execPath, ['-e', `
      const {createSnapshot} = require('./src/service/i18n');
      const {coreTranslator} = require('./src/service/i18n-resources');
      process.stdout.write(coreTranslator(createSnapshot(process.argv[1]))('保存'));
    `, locale], {cwd: path.resolve(__dirname, '..'), encoding: 'utf8'});
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stdout, locale === 'en-US' ? 'Save' : '保存');
  }
});

test('async includes retain the caller translator when templates are cached', async () => {
  const root = path.resolve('www/theme/firekylin');
  const eta = new Eta({varName: 'firekylin', functionHeader: 'const t = firekylin.t;', cache: true});
  eta.loadTemplate('@child', '<%= t("分类") %>', {async: true});
  eta.loadTemplate('@parent', '<%~ await includeAsync("@child") %>', {async: true});
  const outputs = await Promise.all(['en-US', 'zh-CN', 'en-US'].map(locale =>
    eta.renderAsync('@parent', {t: themeTranslator(root, 'firekylin', createSnapshot(locale))})));
  assert.deepEqual(outputs, ['Categories', '分类', 'Categories']);
});
