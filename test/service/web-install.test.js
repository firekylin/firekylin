'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {createRequire} = require('node:module');
const Model = require('think-model/lib/model');
const helper = createRequire(require.resolve('think-model'))('think-helper');

global.think = {
  ...helper, Model, Service: class {}, ROOT_PATH: path.resolve(__dirname, '../..'),
  logger: {error() {}, debug() {}}, config: () => ({})
};
const Install = require('../../src/service/install');
const Options = require('../../src/model/options');
const User = require('../../src/model/user');
const CommentSchema = require('../../src/service/comment-schema');
const site = {title: 'Installation test', site_url: 'https://example.test',
  username: 'admin', password: 'test-only-password', email: 'admin@example.test'};

for (const type of ['sqlite', 'postgresql', 'mysql']) {
  test(`${type}: web installation and safe recovery`, {skip: (type === 'postgresql' && !process.env.FK_TEST_POSTGRES_PORT) || (type === 'mysql' && !process.env.FK_TEST_MYSQL_PORT)}, async t => {
    let serial = 0;
    async function fixture(prefix) {
      const config = type === 'sqlite'
        ? {handle: require('../../src/adapter/sqlite'), path: ':memory:', database: `install_${serial++}`}
        : {handle: require('../../src/adapter/postgresql'), host: '127.0.0.1',
          port: Number(process.env.FK_TEST_POSTGRES_PORT), user: 'postgres', database: 'firekylin_test'};
      if (type === 'mysql') Object.assign(config, {handle: require('think-model-mysql2'),
        port: Number(process.env.FK_TEST_MYSQL_PORT), user: 'root', password: '', encoding: 'utf8mb4'});
      Object.assign(config, {prefix, logConnect: false, logSql: false, debounce: false});
      const service = Object.create(Install.prototype);
      Object.assign(service, {type, dbConfig: config, ip: '127.0.0.1'});
      const models = new Map();
      const getModel = name => {
        name = name || 'user';
        if (name === true && !models.has(name)) models.set(name, new Model('', {...config, database: ''}));
        if (!models.has(name)) models.set(name, new (name === 'options' ? Options : name === 'user' ? User : Model)(name, config));
        return models.get(name);
      };
      service.getModel = getModel;
      // Exercise actual schema migrations and account hashing. Rendering the
      // welcome post is outside this fixture's ThinkJS bootstrap.
      service.addStartPost = async userId => getModel('post').add({user_id: userId, title: 'Welcome', pathname: 'welcome',
        summary: '', markdown_content: '', content: '', update_time: helper.datetime()});
      const comments = Object.create(CommentSchema.prototype);
      comments.model = getModel;
      global.think.config = () => ({type, [type]: config});
      global.think.service = () => comments;
      global.firekylin = {setInstalled() {this.isInstalled = true}};
      t.after(async() => {
        const sockets = new Set([...models.values()].map(model => model.db().query.socket()));
        for (const socket of sockets) {
          // think-mysql may already have evicted and closed older pools.
          if (!socket.pool?._closed) await socket.close();
        }
      });
      return {service, getModel};
    }
    await t.test('cold options write, installation, login password and installed guard', async() => {
      const {service, getModel} = await fixture('fresh_');
      await assert.rejects(getModel('options').ensureOption('plugin-key', 'value'));
      assert.equal(await service.checkInstalled(), false);
      await service.saveSiteInfo(site);
      const options = await getModel('options').getOptions();
      assert.equal(options.site_url, site.site_url);
      const user = await getModel('user').find();
      assert.equal(getModel('user').checkPassword(user, helper.md5(options.password_salt + site.password)), true);
      assert.equal(await service.checkInstalled(), true);
      const before = await getModel('options').select();
      await assert.rejects(service.saveSiteInfo({...site, password: 'replacement'}), /已有用户或内容/);
      assert.deepEqual(await getModel('options').select(), before);
      assert.equal(Number(await getModel('user').count()), 1);
      assert.equal(Number(await getModel('post').count()), 1);
      assert.equal((await getModel('post').find()).user_id, user.id);
    });
    await t.test('failed configuration write can retry without dropping options', async() => {
      const {service, getModel} = await fixture('retry_');
      const options = getModel('options');
      const update = options.updateOptions;
      options.updateOptions = async() => {throw new Error('injected failure')};
      await assert.rejects(service.saveSiteInfo(site), /injected failure/);
      options.updateOptions = update;
      await options.updateOptions('custom-option', 'keep');
      // Simulate the old distribution SQL's misleading default site URL.
      await options.updateOptions('site_url', 'http://127.0.0.1:8360');
      assert.equal(await service.checkInstalled(), false);
      await service.saveSiteInfo(site);
      assert.equal((await options.getOptions())['custom-option'], 'keep');
      assert.equal(Number(await getModel('user').count()), 1);
    });
    await t.test('partial DDL recovers safely', async() => {
      const prefix = type === 'sqlite' ? '' : 'partial_';
      const {service, getModel} = await fixture(prefix);
      await getModel().query(`CREATE TABLE ${prefix}cate (id INTEGER PRIMARY KEY, name VARCHAR(255))`);
      await service.saveSiteInfo(site);
      assert.equal(Number(await getModel('user').count()), 1);
    });
    await t.test('existing content without a user is never reset', async() => {
      const {service, getModel} = await fixture('content_');
      await getModel().query('CREATE TABLE content_post (id INTEGER PRIMARY KEY, title VARCHAR(255))');
      await getModel().query("INSERT INTO content_post (id, title) VALUES (7, 'keep me')");
      await assert.rejects(service.saveSiteInfo(site), /已有用户或内容/);
      assert.equal((await getModel('post').find()).title, 'keep me');
    });
    await t.test('account creation failure remains retryable', async() => {
      const {service, getModel} = await fixture('account_');
      const createAccount = service.createAccount;
      service.createAccount = async() => {throw new Error('injected account failure')};
      await assert.rejects(service.saveSiteInfo(site), /injected account failure/);
      assert.equal(await service.checkInstalled(), false);
      service.createAccount = createAccount;
      await service.saveSiteInfo(site);
      assert.equal(Number(await getModel('user').count()), 1);
    });
    if (type === 'postgresql') {
      await t.test('concurrent workers cannot initialize the same prefix', async() => {
        const {service} = await fixture('concurrent_');
        let release, entered;
        const gate = new Promise(resolve => {release = resolve});
        const started = new Promise(resolve => {entered = resolve});
        const initialize = service.initializeSite;
        service.initializeSite = async data => {
          entered();
          await gate;
          return initialize.call(service, data);
        };
        const first = service.saveSiteInfo(site);
        await started;
        try {
          await assert.rejects(service.saveSiteInfo(site), /安装正在进行中/);
        } finally {
          release();
          await first;
        }
        assert.equal(await service.checkInstalled(), true);
      });
    }
    await t.test('welcome post failure does not reopen installation', async() => {
      const {service, getModel} = await fixture('welcome_');
      service.addStartPost = async() => {throw new Error('injected post failure')};
      await service.saveSiteInfo(site);
      assert.equal(await service.checkInstalled(), true);
      assert.equal(Number(await getModel('user').count()), 1);
    });
  });
}
