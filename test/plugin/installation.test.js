'use strict';

// SQLite runs by default. For live server coverage, point these JSON configs at
// disposable PostgreSQL/MySQL servers with permission to create test databases:
// FK_TEST_POSTGRESQL='{"host":"127.0.0.1","port":55432,"user":"postgres"}'
// FK_TEST_MYSQL='{"host":"127.0.0.1","port":53306,"user":"root","password":"test"}'
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Model = require('think-model/lib/model');
const helper = require('node:module').createRequire(require.resolve('think-model'))('think-helper');
const {PluginManager} = require('../../src/plugin/manager');
const {PluginStateStore} = require('../../src/plugin/state-store');

for (const type of ['sqlite', 'postgresql', 'mysql']) {
  for (const withPlugin of [false, true]) {
    const serverConfig = process.env[`FK_TEST_${type.toUpperCase()}`];
    test(`${type}: empty database startup ${withPlugin ? 'with' : 'without'} plugins, then full installation in the same process`,
      {skip: type !== 'sqlite' && !serverConfig}, async t => {
        const previous = {think: global.think, firekylin: global.firekylin};
        const project = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-install-'));
        const database = `plugin_install_${Date.now()}_${withPlugin ? 1 : 0}`;
        const handle = require(type === 'mysql' ? 'think-model-mysql2' : `think-model-${type}`);
        const config = {...(serverConfig ? JSON.parse(serverConfig) : {}), handle,
          database, prefix: `p_${Date.now()}_${withPlugin ? 1 : 0}_`, path: project, logConnect: false, debounce: false};
        const sockets = new Set();
        const models = {};
        const getModel = name => {
          const instance = new (models[name] || Model)(name, config);
          instance.models = models;
          sockets.add(instance.db().query.socket());
          return instance;
        };
        let admin;
        t.after(async() => {
          for (const socket of sockets) await socket.close();
          if (admin) {
            await admin.query(`DROP DATABASE ${database}`);
            await admin.db().query.socket().close();
          }
          global.think = previous.think;
          global.firekylin = previous.firekylin;
          fs.rmSync(project, {recursive: true, force: true});
        });
        if (type !== 'sqlite') {
          admin = new Model('', {...config, database: type === 'postgresql' ? 'postgres' : ''});
          await admin.query(`CREATE DATABASE ${database}`);
        }
        global.think = {...helper, Model, ROOT_PATH: path.resolve(__dirname, '../..'),
          Service: class { model(name) { return think.model(name) } },
          config: () => ({type, [type]: config}), model: getModel, cache: async() => {},
          logger: {debug() {}, info() {}, error(error) { throw error }},
          service: name => new (require(`../../src/service/${name}`))()};
        for (const name of ['options', 'user', 'post']) models[name] = require(`../../src/model/${name}`);
        if (withPlugin) {
          const root = path.join(project, 'plugins', 'example');
          fs.mkdirSync(root, {recursive: true});
          fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({name: 'example', version: '1.0.0',
            firekylin: {id: 'example', type: 'plugin', entry: 'plugin.js'}}));
          fs.writeFileSync(path.join(root, 'plugin.js'), 'module.exports = {register() {}};');
        }
        const errors = [];
        const stateStore = new PluginStateStore(getModel('options'));
        const manager = new PluginManager({projectPath: project, stateStore, logger: {error: message => errors.push(message)}});
        global.firekylin = {plugins: manager, setInstalled() { this.isInstalled = true }};
        await manager.load();
        assert.equal(manager.plugins.size, 0);
        assert.equal(errors.length, withPlugin ? 1 : 0);
        if (withPlugin) assert.match(errors[0], /no such table|does not exist|doesn't exist/i);
        const Install = require('../../src/service/install');
        const install = new Install('127.0.0.1');
        // Exercise the real SQL import, empty-value update, migrations, account,
        // welcome post and installed flag without replacing any install methods.
        await install.saveSiteInfo({title: 'Installation regression', site_url: 'http://localhost:8360',
          username: 'admin', password: 'test-only-password', email: 'admin@example.test'});
        assert.equal(global.firekylin.isInstalled, true);
        assert.equal(await install.checkInstalled(), true);
        const options = await getModel('options').getOptions(true);
        assert.equal(options.title, 'Installation regression');
        assert.equal(options.plugin_state_migration_v1, undefined);
        assert.equal(Number(await getModel('user').count()), 1);
        assert.equal(Number(await getModel('post').count()), 1);
        await manager.load();
        assert.equal(manager.plugins.size, 0);
        if (withPlugin) {
          assert.equal(manager.states.get('example').enabled, false);
          await stateStore.set('example', true);
          await manager.load();
          assert.equal(manager.plugins.get('example').status, 'active');
        }
      });
  }
}
