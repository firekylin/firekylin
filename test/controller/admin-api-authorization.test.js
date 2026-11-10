'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {promisify} = require('node:util');
const path = require('node:path');
const auth = require('../../src/service/admin-auth');

global.think = {
  Controller: class {
    constructor(ctx) {this.ctx = ctx}
    get() {return ''}
    model() {return {}}
  }, Model: class {}, Service: class {}, promisify,
  ROOT_PATH: path.join(__dirname, '../..'), version: 'test',
  isEmpty: value => !value || Object.keys(value).length === 0,
  isString: value => typeof value === 'string',
  isFunction: value => typeof value === 'function'
};
global.think.Logic = global.think.Controller;
global.firekylin = {require: () => false, USER_ADMIN: 1, USER_EDITOR: 2, USER_CONTRIBUTOR: 3,
  USER_COMMENTER: 4, USER_DISABLED: 2};

const Base = require('../../src/controller/admin/api/base');
const BaseLogic = require('../../src/logic/admin/api/base');

const logics = {
  options: require('../../src/logic/admin/api/options'),
  user: require('../../src/logic/admin/api/user'),
  system: require('../../src/logic/admin/api/system')
};
const Options = require('../../src/controller/admin/api/options');
const User = require('../../src/controller/admin/api/user');
const System = require('../../src/controller/admin/api/system');
const Admin = require('../../src/controller/admin/base');
const OptionsModel = require('../../src/model/options');
const adminOptions = require('../../src/service/admin-options');

const SECRET = 'synthetic-admin-api-regression-secret-at-least-32-bytes';
const TOTP = 'A'.repeat(32);
const stored = {
  title: 'Test blog', site_url: 'https://example.invalid', theme: 'firekylin', defaultCategory: '8',
  logo_url: '/logo.png', password_salt: 'public-password-hashing-salt', ldap_on: '1',
  ldap_whiteList: 'local-account', ldap_user_page: 'https://example.invalid/profile',
  jwt_secret: SECRET, comment_jwt_secret: 'synthetic-comment-secret', comment_schema_version: '1',
  two_factor_auth: TOTP, ldap_password: 'synthetic-ldap-secret',
  ai_credentials: 'synthetic-ai-secret', ai_credential_test: 'synthetic-plugin-secret',
  unknown_plugin_setting: 'synthetic-future-secret',
  push_sites: JSON.stringify({remote: {name: 'Remote', url: 'https://remote.invalid',
    appKey: 'synthetic-remote-key', appSecret: 'synthetic-remote-secret'}}),
  comment: JSON.stringify({smtpPass: 'synthetic-mail-secret', smtpUser: 'private-mail-user'}),
  upload: JSON.stringify({type: 's3', secretAccessKey: 'synthetic-upload-secret'}),
  captcha: JSON.stringify({provider: 'turnstile', siteKey: 'public-site-key', secret: 'synthetic-captcha-secret',
    areas: ['login', 'comment'], theme: 'auto', language: 'auto'})
};
function optionsModel(values = stored) {
  const model = new OptionsModel();
  model.select = async() => Object.entries(values).map(([key, value]) => ({key, value}));
  return model;
}
function controller(Controller, type = 2, resource = 'options', query = {}) {
  const token = type ? auth.sign({id: 2, name: 'test-user', type}, SECRET) : '';
  const ctx = {controller: `admin/api/${resource}`, action: 'get', method: 'GET', state: {},
    cookie: () => token, referrer: () => 'https://example.invalid/admin', path: `/admin/api/${resource}`};
  ctx.get = () => auth.csrfToken({...ctx, state: {jwtSecret: SECRET}});
  const c = new Controller(ctx);
  c.get = key => key ? query[key] : query;
  c.modelInstance = optionsModel();
  c.model = () => c.modelInstance;
  c.success = value => value;
  c.fail = message => {throw new Error(message)};
  return c;
}
async function authorize(c, resourceChecks = false) {
  const Logic = resourceChecks ? logics[c.ctx.controller.split('/').pop()] || BaseLogic : BaseLogic;
  const logic = new Logic(c.ctx);
  logic.get = c.get;
  logic.model = c.model;
  logic.fail = c.fail;
  await logic.__before();
  if (resourceChecks && logic[c.ctx.action + 'Action']) await logic[c.ctx.action + 'Action']();
}
async function dispatch(c) {
  await authorize(c, true);
  await c.__before();
  return c.getAction();
}
function assertPrivateSettingsAbsent(value) {
  const serialized = JSON.stringify(value);
  for (const secret of [SECRET, TOTP, 'synthetic-comment-secret', 'synthetic-ldap-secret',
    'synthetic-ai-secret', 'synthetic-plugin-secret', 'synthetic-future-secret',
    'synthetic-remote-key', 'synthetic-remote-secret', 'synthetic-mail-secret',
    'synthetic-upload-secret', 'synthetic-captcha-secret']) {
    assert.equal(serialized.includes(secret), false, `response must not contain ${secret}`);
  }
  for (const key of ['push_sites', 'upload', 'comment', 'ldap_password', 'unknown_plugin_setting']) {
    assert.equal(Object.hasOwn(value, key), false, `${key} must not be exposed`);
  }
}

test('anonymous requests cannot read options, user or system data', async() => {
  for (const [Controller, resource] of [[Options, 'options'], [User, 'user'], [System, 'system']]) {
    await assert.rejects(dispatch(controller(Controller, null, resource)), /USER_NOT_LOGIN/);
  }
});

test('editor reads use an explicit allowlist and new controllers fail closed', async() => {
  for (const resource of ['post', 'cate', 'tag', 'attachment', 'user', 'options', 'system', 'chat', 'ai-editor']) {
    await authorize(controller(Base, 2, resource));
  }
  for (const resource of ['page', 'comment', 'file', 'ai-image', 'ai-connections', 'ai-logs',
    'extension-settings', 'extension-github', 'marketplace', 'smart-content', 'new-private-api']) {
    await assert.rejects(authorize(controller(Base, 2, resource)), /USER_NO_PERMISSION/);
    await authorize(controller(Base, 1, resource));
  }
  for (const type of ['templateList', 'themeFields']) {
    await authorize(controller(Base, 2, 'theme', {type}));
  }
  for (const type of [undefined, 'file', 'fileList', 'themeList']) {
    await assert.rejects(authorize(controller(Base, 2, 'theme', {type})), /USER_NO_PERMISSION/);
  }
});

test('commenters retain only their comment and profile routes', async() => {
  for (const resource of ['comment', 'user']) await authorize(controller(Base, 4, resource));
  for (const resource of ['options', 'system', 'post', 'attachment', 'theme']) {
    await assert.rejects(authorize(controller(Base, 4, resource)), /USER_NO_PERMISSION/);
  }
});

test('editor options expose only UI settings and keep password hashing compatible', async() => {
  const result = await dispatch(controller(Options));
  assertPrivateSettingsAbsent(result);
  assert.equal(result.title, stored.title);
  assert.equal(result.theme, stored.theme);
  assert.equal(result.password_salt, stored.password_salt);
  assert.equal(result.two_factor_auth, true);
  assert.equal(result.captcha.siteKey, 'public-site-key');
  assert.equal(await dispatch(controller(Options, 2, 'options', {type: 'defaultCategory'})), '8');
  for (const type of ['2fa', 'push', 'unknown']) {
    await assert.rejects(dispatch(controller(Options, 2, 'options', {type})), /USER_NO_PERMISSION/);
  }
});

test('administrator settings and explicit 2FA/push management still work', async() => {
  const result = await dispatch(controller(Options, 1));
  assert.equal(result.upload.secretAccessKey, 'synthetic-upload-secret');
  assert.equal(result.captcha.secret, 'synthetic-captcha-secret');
  assert.equal(result.comment.smtpPass, undefined);
  assert.equal(result.jwt_secret, undefined);
  assert.equal(result.ai_credential_test, undefined);
  assert.equal(result.push_sites, undefined);
  assert.equal(result.two_factor_auth, true);
  const twoFactor = await dispatch(controller(Options, 1, 'options', {type: '2fa'}));
  assert.equal(twoFactor.secret, TOTP);
  const push = await dispatch(controller(Options, 1, 'options', {type: 'push', key: 'remote'}));
  assert.equal(push.appSecret, 'synthetic-remote-secret');
});

test('disabled 2FA can still generate an administrator enrollment secret', async() => {
  const c = controller(Options, 1, 'options', {type: '2fa'});
  c.modelInstance = optionsModel({...stored, two_factor_auth: undefined});
  const result = await dispatch(c);
  assert.equal(result.secret.length, 32);
  assert.match(result.otpauth_url, /^otpauth:\/\/totp\//);
});

test('safe serialization does not mutate server credentials or administrator settings', async() => {
  const options = await optionsModel().getOptions(true);
  const before = structuredClone(options);
  adminOptions(options);
  adminOptions(options, true);
  assert.deepEqual(options, before);
});

for (const type of [null, 1, 2, 4]) {
  test(`admin template data protects credentials for role ${type}`, async() => {
    const c = controller(Admin, type);
    c.isAjax = () => false;
    c.service = () => ({services: async() => [{name: 'github', title: 'GitHub'}]});
    const assigned = {};
    c.assign = (key, value) => {assigned[key] = value};
    c.display = async() => assigned;
    await c.__before();
    await c.__call();
    if (type !== 1) assertPrivateSettingsAbsent(assigned.options);
    else assert.equal(assigned.options.upload.secretAccessKey, 'synthetic-upload-secret');
    assert.equal(assigned.options.two_factor_auth, true);
    assert.equal(assigned.options.password_salt, stored.password_salt);
    assert.equal(assigned.options.push_sites, undefined);
    assert.equal(assigned.publicCaptcha.secret, undefined);
    assert.equal(c.authOptions.two_factor_auth, TOTP);
  });
}

const accounts = [1, 2].map(id => ({id, name: `user-${id}`, display_name: `User ${id}`, type: id,
  email: `user-${id}@example.invalid`, status: 1, app_key: `synthetic-user-${id}-key`,
  app_secret: `synthetic-user-${id}-secret`, password: 'synthetic-password-hash'}));
function userController(type, id, query = {}) {
  const c = controller(User, type, 'user', query);
  c.id = id;
  if (id !== undefined) c.ctx.path += '/' + id;
  const options = c.modelInstance;
  let fields;
  let where;
  const project = row => row ? Object.fromEntries(fields.split(',').map(key => [key, row[key]])) : {};
  c.modelInstance = {
    field(value) {fields = value; return this},
    where(value) {where = value; return this},
    find: async() => project(accounts.find(user => String(user.id) === String(where.id))),
    select: async() => accounts.map(project)
  };
  const posts = {field() {return this}, setRelation() {return this}, group() {return this},
    select: async() => [{user_id: 1, post_num: 3, comment_num: 4}]};
  c.model = name => name === 'options' ? options : posts;
  c.service = () => ({
    list: async ids => (Array.isArray(ids) ? ids : [ids]).map(user_id => ({user_id, provider: 'github'})),
    services: async() => []
  });
  return c;
}

test('editor author directory never includes account details or push credentials', async() => {
  for (const query of [{}, {type: 'contributor'}]) {
    const result = await dispatch(userController(2, undefined, query));
    assert.deepEqual(result.map(user => Object.keys(user)), [
      ['id', 'name', 'display_name', 'type'], ['id', 'name', 'display_name', 'type']
    ]);
    assert.equal(result[0].name, 'user-1');
  }
});

for (const type of [2, 4]) {
  test(`role ${type} can read its own profile without push credentials`, async() => {
    const result = await dispatch(userController(type, '2'));
    assert.equal(result.email, 'user-2@example.invalid');
    assert.equal(result.social_accounts[0].user_id, 2);
    assert.equal(result.social_services[0].name, 'github');
    for (const key of ['app_key', 'app_secret', 'password']) assert.equal(Object.hasOwn(result, key), false);
    await assert.rejects(dispatch(userController(type, '1')), /USER_NO_PERMISSION/);
  });
}

test('commenters cannot enumerate users', async() => {
  await assert.rejects(dispatch(userController(4)), /USER_NO_PERMISSION/);
});

test('administrators retain user management, social links and push credentials', async() => {
  const user = await dispatch(userController(1, '1'));
  assert.equal(user.app_secret, 'synthetic-user-1-secret');
  const users = await dispatch(userController(1));
  assert.equal(users[0].app_key, 'synthetic-user-1-key');
  assert.equal(users[0].post_num, 3);
  assert.equal(users[0].social_accounts[0].provider, 'github');
  assert.equal(Object.hasOwn(user, 'password'), false);
});

for (const type of [1, 2]) {
  test(`dashboard returns counts and versions without configuration for role ${type}`, async t => {
    t.mock.method(global, 'fetch', async() => ({ok: true, json: async() => ({version: '0.0.0'})}));
    const c = controller(System, type, 'system');
    const options = c.modelInstance;
    c.modelInstance = {
      query: async() => [{version: 'test-db'}],
      select: async() => assert.fail('dashboard must not read raw configuration')
    };
    const scopes = [];
    const counter = {where(value) {scopes.push(value); return this}, count: async() => 3, sum: async() => 4};
    c.model = name => name === 'options' ? options : counter;
    c.config = () => ({type: 'sqlite'});
    const result = await dispatch(c);
    assert.deepEqual(result.config, {});
    assert.equal(result.versions.mysqlVersion, 'test-db');
    assert.deepEqual(result.count, {posts: 3, cates: 3, comments: 4});
    assert.deepEqual(scopes, type === 1 ? [{}, {}] : [{user_id: 2}, {user_id: 2}]);
  });
}

test('unsupported and tampered role claims cannot enter the REST API', async() => {
  const crypto = require('node:crypto');
  for (const type of [0, 3, 5, -1]) {
    const c = controller(Base, 2, 'options');
    const [header, encoded] = c.ctx.cookie().split('.');
    const payload = Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(encoded, 'base64url')), type}))
      .toString('base64url');
    const data = `${header}.${payload}`;
    const signature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
    c.ctx.cookie = () => `${data}.${signature}`;
    await assert.rejects(authorize(c), /USER_NOT_LOGIN/);
  }
});

test('existing editor writes and commenter profile/comment writes remain available', async() => {
  for (const [type, resource, action] of [[2, 'post', 'post'], [2, 'post', 'put'], [2, 'post', 'delete'],
    [2, 'file', 'post'], [2, 'attachment', 'delete'], [2, 'markdown', 'post'], [2, 'chat', 'post'],
    [2, 'ai-editor', 'post'], [2, 'ai-image', 'post'], [4, 'user', 'put'], [4, 'comment', 'post']]) {
    const c = controller(Base, type, resource);
    c.ctx.action = action;
    c.ctx.method = 'POST';
    await authorize(c);
  }
  for (const type of [2, 4]) {
    for (const resource of ['options', 'system', 'theme']) {
      const c = controller(Base, type, resource);
      c.ctx.action = 'put';
      c.ctx.method = 'POST';
      await assert.rejects(authorize(c), /USER_NO_PERMISSION/);
    }
  }
});

test('administrator upload and captcha settings survive a read/edit/save round trip', async() => {
  const c = controller(Options, 1);
  const settings = await dispatch(c);
  const data = {upload: JSON.stringify(settings.upload), captcha: JSON.stringify(settings.captcha)};
  let saved;
  c.modelInstance.updateOptions = async value => {saved = value};
  c.post = () => data;
  c.ctx.action = 'put';
  c.ctx.method = 'POST';
  await authorize(c, true);
  await c.__before();
  await c.putAction();
  assert.equal(JSON.parse(saved.upload).secretAccessKey, 'synthetic-upload-secret');
  assert.equal(JSON.parse(saved.captcha).secret, 'synthetic-captcha-secret');
});
