const assert = require('node:assert/strict');
const fs = require('node:fs');
const {createRequire} = require('node:module');
const path = require('node:path');
const test = require('node:test');
const Widget = require('../../src/common/widget/base');
const ThinkViewEta = require('think-view-eta');
const Options = require('../../src/home/widget/options');

const {Eta} = createRequire(require.resolve('think-view-eta'))('eta');

test('Eta awaits and iterates a widget', async() => {
  const eta = new Eta({varName: 'firekylin'});
  const widget = new Widget({ctx: {}, model() {}}, {});
  widget.pushAll([{name: 'one'}, {name: 'two'}]);
  const output = await eta.renderStringAsync(
    '<% const items = await firekylin.widget("Items"); %><% while (items.next()) { %><%= items.name %><% } %>',
    {widget: async() => widget}
  );
  assert.equal(output, 'onetwo');
});

test('migrated theme templates compile with async blocks', () => {
  const eta = new Eta({varName: 'firekylin'});
  const root = path.join(__dirname, '../../www/theme/firekylin');
  [
    'index.eta',
    'post.eta',
    'page.eta',
    'archive.eta',
    'search.eta',
    'tag.eta',
    'cate.eta',
    'template/cates_list.eta'
  ].forEach(file => {
    assert.doesNotThrow(() => eta.compile(fs.readFileSync(path.join(root, file), 'utf8'), {async: true}));
  });
});

test('view adapter resolves layouts from the theme directory', async() => {
  const root = path.join(__dirname, '../../www/theme/firekylin');
  const tags = new Widget({ctx: {}, model() {}}, {});
  tags.push({name: 'Eta', pathname: 'eta', count: 1});
  const siteOptions = new Options({ctx: {host: 'example.com'}, model() {}}, {});
  siteOptions.push({
    comment: {name: '', type: 'disqus'},
    navigation: [],
    theme: 'firekylin',
    themeConfig: {},
    title: 'Test',
    siteUrl: 'https://example.com'
  });
  const data = {
    VERSION: 'test',
    currentYear: 2026,
    ctx: {hostname: 'example.com'},
    widget: async name => name === 'Widget_Options' ? siteOptions : tags
  };
  const adapter = new ThinkViewEta(path.join(root, 'tag.eta'), data, {
    viewPath: root,
    options: {varName: 'firekylin'}
  });

  const output = await adapter.render();
  assert.match(output, /<title>标签 - Test<\/title>/);
  assert.match(output, /data-tag="Eta">Eta\(1\)<\/a>/);
});
