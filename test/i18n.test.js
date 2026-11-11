const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {createTranslator, createSnapshot, runWithSnapshot, currentSnapshot} = require('../src/i18n');
const {parseDictionary, loadResources} = require('../src/i18n/resources');
const settings = require('../src/i18n/settings');

const translate = resources => createTranslator({namespace: 'core', snapshot: createSnapshot('en-US'), resources});

test('exact matching, empty values and namespace-local fallback', () => {
  const t = translate({'en-US': {'a.b:c': ''}, en: {'基础': 'Base'}, 'zh-CN': {'默认': 'Default'}});
  assert.equal(t('a.b:c'), '');
  assert.equal(t('基础'), 'Base');
  assert.equal(t('默认'), 'Default');
  assert.equal(t(' 未知 '), ' 未知 ');
  assert.equal(translate({})('基础'), '基础');
});

test('single interpolation preserves falsy values and rejects inherited or unsafe variables', () => {
  const t = translate({});
  for (const value of [0, false, '', null, undefined, '{{evil}}', '<%= process.exit() %>']) {
    assert.equal(t('{{value}}', {value}), value == null ? '' : String(value));
  }
  assert.throws(() => t('{{value}}', Object.create({value: 'bad'})));
  assert.throws(() => t('{{value}}', {value: {}}));
  assert.throws(() => t('{{constructor}}'));
  assert.throws(() => t('{{user.name}}'));
});

test('resource parser rejects duplicates, invalid values and inconsistent placeholders', () => {
  for (const source of ['{"a":"x","a":"y"}', '{"a":1}', '{"__proto__":"bad"}', '{"{{a}}":"{{b}}"}']) {
    assert.throws(() => parseDictionary(source));
  }
  assert.equal(parseDictionary('{"a":""}').a, '');
});

test('resource loader confines symlinks and enforces size limits', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fk-i18n-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.mkdirSync(path.join(root, 'locales'));
  fs.writeFileSync(path.join(root, 'outside.json'), '{}');
  fs.symlinkSync('../outside.json', path.join(root, 'locales/en-US.json'));
  assert.throws(() => loadResources(root));
  fs.unlinkSync(path.join(root, 'locales/en-US.json'));
  fs.writeFileSync(path.join(root, 'locales/en-US.json'), ' '.repeat(256 * 1024 + 1));
  assert.throws(() => loadResources(root));
});

test('concurrent tasks isolate immutable snapshots', async () => {
  await Promise.all(['en-US', 'zh-CN'].map(locale => runWithSnapshot(createSnapshot(locale), async () => {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(currentSnapshot().locale, locale);
    assert.ok(Object.isFrozen(currentSnapshot()));
  })));
  assert.equal(currentSnapshot(), undefined);
});

test('persistent locale and revision form one value, with safe legacy defaults', () => {
  const value = settings.encode('en-US');
  assert.equal(settings.decode(value).locale, 'en-US');
  assert.notEqual(settings.decode(value).revision, settings.decode(settings.encode('en-US')).revision);
  assert.equal(settings.decode('bad').locale, 'zh-CN');
  assert.throws(() => settings.encode('../../bad'));
  assert.deepEqual(Object.keys(settings.publicSettings(settings.decode(value))).sort(),
    ['locale', 'localeResourceVersion', 'localeRevision', 'supportedLocales']);
});
