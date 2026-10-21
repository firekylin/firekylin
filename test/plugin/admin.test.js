'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const AdminRegistry = require('../../src/plugin/admin');

function registerExample(admin) {
  admin.registerPanel({id: 'tools', title: '内容工具'}, 'example');
  admin.registerPage({
    id: 'settings', panel: 'tools', title: '阅读设置',
    load: async() => ({sections: [
      {type: 'stat', items: [{label: '文章', value: 3}]},
      {type: 'grid', columns: 2, items: [{type: 'text', content: 'ready'}, {type: 'form', id: 'preferences'}]},
      {type: 'actions', ids: ['rebuild']}
    ]})
  }, 'example');
  admin.registerForm({
    id: 'preferences', page: 'settings', title: '偏好',
    fields: [
      {name: 'id', type: 'hidden', label: 'ID'},
      {name: 'enabled', type: 'switch', label: '启用'},
      {name: 'color', type: 'select', label: '颜色', required: true, options: [{label: '蓝色', value: 'blue'}]},
      {name: 'caption', type: 'text', label: '说明', required: true,
        visibleWhen: {field: 'color', values: ['red']}},
      {name: 'secret', type: 'password', label: '密钥'}
    ],
    load: async() => ({id: 'record-1', enabled: true, color: 'blue', secret: 'do-not-return'}),
    submit: async values => ({saved: values})
  }, 'example');
  admin.registerAction({
    id: 'rebuild', page: 'settings', label: '重建', type: 'danger', confirm: '确定？',
    handler: async input => ({received: input})
  }, 'example');
  admin.registerEditorAction({
    id: 'rewrite', action: 'rebuild', label: '改写', order: 20
  }, 'example');
}

test('admin registry exposes a serializable manifest and executes handlers', async() => {
  const admin = new AdminRegistry();
  registerExample(admin);
  const manifest = admin.manifest();
  assert.equal(manifest[0].panels[0].title, '内容工具');
  assert.equal(manifest[0].forms[0].fields[0].type, 'hidden');
  assert.equal(manifest[0].forms[0].fields[2].options[0].value, 'blue');
  assert.deepEqual(manifest[0].forms[0].fields[3].visibleWhen, {field: 'color', values: ['red']});
  assert.equal('handler' in manifest[0].actions[0], false);
  assert.deepEqual(manifest[0].editorActions, [
    {id: 'rewrite', action: 'rebuild', label: '改写', order: 20}
  ]);
  assert.deepEqual(await admin.loadPage('example', 'settings', {}), {
    page: {id: 'settings', title: '阅读设置', panel: 'tools', description: undefined, order: 100},
    content: {sections: [
      {type: 'stat', items: [{label: '文章', value: 3}]},
      {type: 'grid', columns: 2, items: [{type: 'text', content: 'ready'}, {type: 'form', id: 'preferences'}]},
      {type: 'actions', ids: ['rebuild']}
    ]}
  });
  assert.deepEqual(await admin.loadForm('example', 'preferences', {}), {id: 'record-1', enabled: true, color: 'blue'});
  assert.deepEqual(await admin.submitForm('example', 'preferences', {
    enabled: false, color: 'blue', caption: 'discarded while hidden', injected: 'discarded'
  }, {}), {saved: {enabled: false, color: 'blue'}});
  await assert.rejects(admin.submitForm('example', 'preferences', {color: 'red'}, {}), /caption/);
  await assert.rejects(admin.submitForm('example', 'preferences', {enabled: true}, {}), {status: 400});
  assert.deepEqual(await admin.runAction('example', 'rebuild', {all: true}, {}), {received: {all: true}});
});

test('admin registry validates relationships and removes every plugin resource', () => {
  const admin = new AdminRegistry();
  assert.throws(() => admin.registerPage({id: 'page', panel: 'missing', title: 'Page'}, 'example'), /Unknown/);
  registerExample(admin);
  assert.throws(() => admin.registerForm({
    id: 'invalid-radio', page: 'settings', title: 'Invalid',
    fields: [{name: 'choice', type: 'radio', label: 'Choice'}], submit() {}
  }, 'example'), /requires options/);
  assert.throws(() => admin.registerForm({
    id: 'invalid-condition', page: 'settings', title: 'Invalid',
    fields: [{name: 'value', label: 'Value', visibleWhen: {field: 'missing', values: ['yes']}}], submit() {}
  }, 'example'), /visibleWhen references/);
  assert.throws(() => admin.registerPanel({id: 'tools', title: 'Again'}, 'example'), /already registered/);
  assert.throws(() => admin.registerEditorAction({
    id: 'missing', action: 'missing', label: 'Missing'
  }, 'example'), /Unknown editor action/);
  admin.removePlugin('example');
  assert.deepEqual(admin.manifest(), []);
});

test('admin page layouts reject unknown types and cross-page references', async() => {
  const admin = new AdminRegistry();
  admin.registerPanel({id: 'tools', title: 'Tools'}, 'example');
  admin.registerPage({id: 'bad-type', panel: 'tools', title: 'Bad', load: () => ({
    sections: [{type: 'unsafe-html', content: '<script />'}]
  })}, 'example');
  admin.registerPage({id: 'bad-reference', panel: 'tools', title: 'Bad ref', load: () => ({
    sections: [{type: 'form', id: 'other-form'}]
  })}, 'example');
  await assert.rejects(admin.loadPage('example', 'bad-type', {}), /unsupported section/);
  await assert.rejects(admin.loadPage('example', 'bad-reference', {}), /Unknown admin form reference/);
});

test('admin tables validate search and selected-row actions', async() => {
  const admin = new AdminRegistry();
  admin.registerPanel({id: 'tools', title: 'Tools'}, 'example');
  admin.registerPage({id: 'items', panel: 'tools', title: 'Items', load: () => ({sections: [{
    type: 'table', columns: [{key: 'title', title: 'Title'}], rows: [{id: 1, title: 'One'}],
    search: {keys: ['title'], placeholder: 'Search items'},
    selection: {input: 'ids', actions: [{action: 'remove', label: 'Remove'}]}
  }]})}, 'example');
  admin.registerAction({id: 'remove', page: 'items', label: 'Remove', handler: input => input}, 'example');
  const loaded = await admin.loadPage('example', 'items', {});
  assert.deepEqual(loaded.content.sections[0].search.keys, ['title']);
  assert.equal(loaded.content.sections[0].selection.actions[0].action, 'remove');

  admin.registerPage({id: 'invalid-table', panel: 'tools', title: 'Invalid', load: () => ({sections: [{
    type: 'table', search: {keys: [null]}, selection: {actions: []}
  }]})}, 'example');
  await assert.rejects(admin.loadPage('example', 'invalid-table', {}), /search.keys/);
});

test('admin page tabs validate and nest sections', async() => {
  const admin = new AdminRegistry();
  admin.registerPanel({id: 'tools', title: 'Tools'}, 'example');
  admin.registerPage({id: 'settings', panel: 'tools', title: 'Settings', load: () => ({sections: [{
    type: 'tabs', items: [
      {key: 'general', label: 'General', sections: [{type: 'text', content: 'General settings'}]},
      {key: 'publish', label: 'Publish', sections: [{type: 'markdown', content: 'Publishing settings'}]}
    ]
  }]})}, 'example');
  const loaded = await admin.loadPage('example', 'settings', {});
  assert.equal(loaded.content.sections[0].items[1].key, 'publish');

  admin.registerPage({id: 'invalid-tabs', panel: 'tools', title: 'Invalid', load: () => ({sections: [{
    type: 'tabs', items: [{key: 'same', label: 'One', sections: []}, {key: 'same', label: 'Two', sections: []}]
  }]})}, 'example');
  await assert.rejects(admin.loadPage('example', 'invalid-tabs', {}), /Duplicate admin tab key/);
});

test('admin pages can be routable without appearing in the panel menu', async() => {
  const admin = new AdminRegistry();
  admin.registerPanel({id: 'tools', title: 'Tools'}, 'example');
  admin.registerPage({
    id: 'detail', panel: 'tools', title: 'Detail', menu: false,
    load: async() => ({sections: [{type: 'text', content: 'hidden page'}]})
  }, 'example');

  assert.equal(admin.manifest()[0].pages[0].menu, false);
  assert.deepEqual(await admin.loadPage('example', 'detail', {}), {
    page: {id: 'detail', title: 'Detail', panel: 'tools', description: undefined, order: 100, menu: false},
    content: {sections: [{type: 'text', content: 'hidden page'}]}
  });
});
