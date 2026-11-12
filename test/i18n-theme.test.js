const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const {Eta} = createRequire(require.resolve('think-view-eta'))('eta');
const {themeTranslator, translateFields} = require('../src/service/i18n-theme');

const root = path.resolve('www/theme/firekylin');

test('theme field projection preserves submitted values and source objects', () => {
  const source = [{name: '分类', label: '分类', default: '分类', options: ['分类']}];
  const t = themeTranslator(root, 'firekylin', 'en-US');
  const result = translateFields(source, t);
  assert.equal(result[0].label, 'Categories');
  assert.equal(result[0].name, '分类');
  assert.equal(result[0].default, '分类');
  assert.deepEqual(result[0].options, [{value: '分类', label: 'Categories'}]);
  assert.deepEqual(source[0].options, ['分类']);
});

test('Eta cached templates bind translators per render and escape variables once', async () => {
  const eta = new Eta({varName: 'firekylin', functionHeader: 'const t = firekylin.t;', cache: true});
  const template = eta.compile('<%= t("分类") %> <%= t("{{value}}", {value: firekylin.value}) %>');
  for (const locale of ['en-US', 'zh-CN', 'en-US']) {
    const result = eta.render(template, {t: themeTranslator(root, 'firekylin', locale), value: '<script>'});
    assert.equal(result, (locale === 'en-US' ? 'Categories' : '分类') + ' &lt;script&gt;');
  }
});

test('bundled pagination renders with the template translation function', () => {
  const eta = new Eta({varName: 'firekylin', functionHeader: 'const t = firekylin.t;', cache: true});
  const template = eta.compile(fs.readFileSync(path.join(root, 'inc/pagination.eta'), 'utf8'));
  for (const locale of ['en-US', 'zh-CN']) {
    const output = eta.render(template, {
      t: themeTranslator(root, 'firekylin', locale),
      pagination: {currentPage: 2, totalPages: 3},
      ctx: {url: '/?page=2'}
    });
    assert.match(output, locale === 'en-US' ? /Next/ : /下一页/);
  }
});
