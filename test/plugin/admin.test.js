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
      {name: 'enabled', type: 'switch', label: '启用'},
      {name: 'color', type: 'select', label: '颜色', required: true, options: [{label: '蓝色', value: 'blue'}]},
      {name: 'secret', type: 'password', label: '密钥'}
    ],
    load: async() => ({enabled: true, color: 'blue', secret: 'do-not-return'}),
    submit: async values => ({saved: values})
  }, 'example');
  admin.registerAction({
    id: 'rebuild', page: 'settings', label: '重建', type: 'danger', confirm: '确定？',
    handler: async input => ({received: input})
  }, 'example');
}

test('admin registry exposes a serializable manifest and executes handlers', async() => {
  const admin = new AdminRegistry();
  registerExample(admin);
  const manifest = admin.manifest();
  assert.equal(manifest[0].panels[0].title, '内容工具');
  assert.equal(manifest[0].forms[0].fields[1].options[0].value, 'blue');
  assert.equal('handler' in manifest[0].actions[0], false);
  assert.deepEqual(await admin.loadPage('example', 'settings', {}), {
    page: {id: 'settings', title: '阅读设置', panel: 'tools', description: undefined, order: 100},
    content: {sections: [
      {type: 'stat', items: [{label: '文章', value: 3}]},
      {type: 'grid', columns: 2, items: [{type: 'text', content: 'ready'}, {type: 'form', id: 'preferences'}]},
      {type: 'actions', ids: ['rebuild']}
    ]}
  });
  assert.deepEqual(await admin.loadForm('example', 'preferences', {}), {enabled: true, color: 'blue'});
  assert.deepEqual(await admin.submitForm('example', 'preferences', {
    enabled: false, color: 'blue', injected: 'discarded'
  }, {}), {saved: {enabled: false, color: 'blue'}});
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
  assert.throws(() => admin.registerPanel({id: 'tools', title: 'Again'}, 'example'), /already registered/);
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
