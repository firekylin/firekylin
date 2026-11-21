'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Eta = require('think-view-eta');
const view = require('think-view').controller;

class Controller {
  constructor(ctx) {
    this.ctx = ctx;
  }

  config(name) {
    if (name === 'view') return {type: 'eta', eta: {handle: Eta, extname: '.eta'}};
    return {};
  }

  model(name) {
    assert.equal(name, 'options');
    return {getOptions: async() => {
      if (this.ctx.optionsError) throw this.ctx.optionsError;
      return {...this.ctx.options};
    }};
  }

  service(name) {
    assert.equal(name, 'comment-render');
    return {render: () => '<aside>comments</aside>'};
  }

  redirect() {
    throw new Error('Rendering must not redirect');
  }
}
Object.assign(Controller.prototype, view);
global.think = {Controller, env: 'development', ROOT_PATH: path.join(__dirname, '../..')};
global.firekylin = {isInstalled: true};
const {registerWidgetMap} = require('../../src/widget/registry');
registerWidgetMap(require('../../src/widget'));
const renderTheme = require('../../src/plugin/theme-render');
const BaseController = require('../../src/controller/base');
const middleware = require('../../src/plugin/middleware');
const RouteRegistry = require('../../src/plugin/routes');

async function fixture(t) {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), 'firekylin-theme-route-'));
  const root = path.join(project, 'themes', 'custom');
  await fs.mkdir(path.join(root, 'plugins', 'say'), {recursive: true});
  await fs.mkdir(path.join(root, 'locales'));
  await fs.writeFile(path.join(project, 'firekylin.config.js'), 'module.exports = {database: {type: "sqlite"}};');
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({name: 'custom'}));
  await fs.writeFile(path.join(root, 'locales', 'en-US.json'), JSON.stringify({hello: 'Hello'}));
  const previous = process.env.FIREKYLIN_PROJECT_PATH;
  process.env.FIREKYLIN_PROJECT_PATH = project;
  t.after(async() => {
    if (previous === undefined) delete process.env.FIREKYLIN_PROJECT_PATH;
    else process.env.FIREKYLIN_PROJECT_PATH = previous;
    await fs.rm(project, {recursive: true, force: true});
  });
  const events = [];
  const routes = new RouteRegistry();
  global.firekylin.plugins = {
    routes,
    templateContext: controller => ({
      plugin: {demo: {value: async() => (await controller.getWidget('Widget_Options')).row.title}},
      filters: {demo: value => value.toUpperCase()},
      slots: {render: async() => '<footer>slot</footer>'}
    }),
    events: {emit: async(name, context) => {
      events.push({name, context});
      if (name === 'theme.beforeRender') context.controller.assign('fromHook', 'hook');
    }}
  };
  const ctx = {
    app: {emit() {}}, state: {locale: 'en-US'}, query: {}, request: {},
    method: 'GET', path: '/says', url: '/says', action: 'index',
    host: 'example.test', hostname: 'example.test', body: undefined,
    options: {title: 'My blog', site_url: 'https://example.test', theme: 'custom', navigation: '[]',
      themeConfig: '{}', jwt_secret: 'private-secret', ai_credentials: 'private-ai'}
  };
  const write = (name, content) => fs.writeFile(path.join(root, name), content);
  return {project, root, ctx, routes, events, write};
}

test('site theme renderer reuses Eta layouts, relative includes and normal theme helpers', async t => {
  const {ctx, write, events} = await fixture(t);
  await write('layout.eta', '<html><%~ firekylin.body %></html>');
  await write('plugins/say/partial.eta', '<b><%= firekylin.say.title %></b>');
  await write('plugins/say/list.eta', `<% layout('../../layout') %>
<% const site = await firekylin.widget('Widget_Options'); %>
<%= t('hello') %>|<%= site.title() %>|<%= firekylin.VERSION %>|<%= firekylin.currentYear %>
<%= typeof firekylin.think %>|<%= site.row.jwt_secret %>|<%= site.row.ai_credentials %>
<%~ await includeAsync('./partial', firekylin) %>|<%= await firekylin.plugin.demo.value() %>
<%= firekylin.filters.demo('filter') %>|<%~ await firekylin.slots.render('post.after') %>
<%~ firekylin.comment() %>|<%= firekylin.fromHook %>`);
  ctx.url = '/says.json';
  const html = await renderTheme(ctx, 'say', 'list', {say: {title: '<unsafe>'}});
  assert.match(html, /^<html>/);
  assert.match(html, /Hello\|My blog/);
  assert.match(html, /<b>&lt;unsafe&gt;<\/b>/);
  assert.match(html, /FILTER/);
  assert.match(html, /<footer>slot<\/footer>/);
  assert.match(html, /<aside>comments<\/aside>\|hook/);
  assert.doesNotMatch(html, /private-secret|private-ai/);
  assert.equal(ctx.body, undefined);
  assert.equal(ctx.type, undefined);
  assert.deepEqual(events.map(event => event.name), ['theme.beforeRender', 'theme.afterRender']);
  assert.equal(events[0].context.name, 'plugins/say/list');
  assert.equal(events[1].context.response, html);
});

test('only a missing exact override returns undefined and does not render a similarly named template', async t => {
  const {ctx, write, events} = await fixture(t);
  await write('list.eta', 'root template must not be selected');
  ctx.body = 'unchanged';
  assert.equal(await renderTheme(ctx, 'say', 'list'), undefined);
  assert.equal(ctx.body, 'unchanged');
  assert.equal(events.length, 0);
});

test('empty override is a successful render, not fallback', async t => {
  const {ctx, write} = await fixture(t);
  await write('plugins/say/list.eta', '');
  assert.equal(await renderTheme(ctx, 'say', 'list'), '');
});

test('template syntax, missing layouts, runtime and database errors propagate', async t => {
  const {ctx, write} = await fixture(t);
  await write('plugins/say/list.eta', '<% this is invalid syntax %>');
  await assert.rejects(renderTheme(ctx, 'say', 'list'));
  await write('plugins/say/list.eta', '<% layout(\'./missing-layout\') %>text');
  await assert.rejects(renderTheme(ctx, 'say', 'list'), /missing-layout/);
  await write('plugins/say/list.eta', '<% throw new Error(\'render failure\') %>');
  await assert.rejects(renderTheme(ctx, 'say', 'list'), /render failure/);
  ctx.optionsError = new Error('database failure');
  await assert.rejects(renderTheme(ctx, 'say', 'missing'), /database failure/);
});

test('invalid names, data and paths cannot select or replace core rendering context', async t => {
  const {ctx, write, root, project} = await fixture(t);
  await write('plugins/say/list.eta', 'safe');
  for (const name of ['../list', '/list', 'list.eta', 'a/b', 'a\\b', 'a\0b', '']) {
    await assert.rejects(renderTheme(ctx, 'say', name), /Invalid/);
  }
  await assert.rejects(renderTheme(ctx, '../other', 'list'), /Invalid/);
  await assert.rejects(renderTheme(ctx, 'say', 'list', []), /plain object/);
  await assert.rejects(renderTheme(ctx, 'say', 'list', {widget: 'bad'}), /cannot replace widget/);
  await assert.rejects(renderTheme(ctx, 'say', 'list', JSON.parse('{"__proto__":{}}')), /cannot replace/);
  const outside = path.join(project, 'outside.eta');
  await fs.writeFile(outside, 'outside');
  await fs.symlink(outside, path.join(root, 'plugins/say/escape.eta'));
  await assert.rejects(renderTheme(ctx, 'say', 'escape'), /escapes/);
  ctx.options.theme = '../..';
  await assert.rejects(renderTheme(ctx, 'say', 'list'), /escapes/);
});

test('non-file overrides are errors while a missing active theme has no override', async t => {
  const {ctx, root} = await fixture(t);
  await fs.mkdir(path.join(root, 'plugins/say/list.eta'));
  await assert.rejects(renderTheme(ctx, 'say', 'list'), /must be a file/);
  ctx.options.theme = 'missing-theme';
  assert.equal(await renderTheme(ctx, 'say', 'list'), undefined);
});

test('site handler opts into rendering while fallback, API and nonmatching routes remain unchanged', async t => {
  const {ctx, routes, write} = await fixture(t);
  const run = middleware();
  routes.register({scope: 'site', path: '/says', csrf: false, async handler({renderTheme: render}) {
    return (await render('list', {say: {title: 'custom'}})) ?? 'fallback';
  }}, 'say');
  await run(ctx, () => assert.fail('matched route'));
  assert.equal(ctx.body, 'fallback');
  await write('plugins/say/list.eta', '<%= firekylin.say.title %>');
  await run(ctx, () => assert.fail('matched route'));
  assert.equal(ctx.body, 'custom');
  routes.register({path: '/data', csrf: false, handler(context) {
    assert.equal(context.renderTheme, undefined);
    return {ok: true};
  }}, 'say');
  ctx.path = '/api/plugins/say/data';
  await run(ctx, () => assert.fail('matched route'));
  assert.deepEqual(ctx.body, {ok: true});
  ctx.path = '/existing-core-route';
  let next = false;
  await run(ctx, () => { next = true });
  assert.equal(next, true);
});

test('site routes which do not call renderTheme perform no view work or response conversion', async t => {
  const {ctx, routes} = await fixture(t);
  ctx.optionsError = new Error('must not read options');
  routes.register({scope: 'site', path: '/says', csrf: false, handler() { return {items: []} }}, 'say');
  await middleware()(ctx, () => assert.fail('matched route'));
  assert.deepEqual(ctx.body, {items: []});
});

test('concurrent renders keep their view data isolated', async t => {
  const {ctx, write} = await fixture(t);
  await write('plugins/say/list.eta', '<% await Promise.resolve(); %><%= firekylin.say.title %>');
  assert.deepEqual(await Promise.all([
    renderTheme(ctx, 'say', 'list', {say: {title: 'one'}}),
    renderTheme(ctx, 'say', 'list', {say: {title: 'two'}})
  ]), ['one', 'two']);
});

test('existing core HTML and JSON displayView behavior stays intact', async t => {
  const {ctx, write, events} = await fixture(t);
  await write('index.eta', '<%= (await firekylin.widget("Widget_Options")).title() %>');
  const controller = new BaseController(ctx);
  await controller.__before();
  assert.equal(await controller.displayView('index'), false);
  assert.equal(ctx.body, 'My blog');
  assert.equal(events.at(-1).context.response, 'My blog');
  ctx.url = '/index.json';
  controller.assign('example', 'json data');
  assert.equal(await controller.displayView('index'), true);
  assert.equal(ctx.type, 'application/json');
  assert.equal(ctx.body.example, 'json data');
  assert.equal(ctx.body.widget, undefined);
});

test('active theme symlinks must stay within the configured themes root', async t => {
  const {ctx, write, project, root} = await fixture(t);
  await write('plugins/say/list.eta', 'inside');
  await fs.symlink(root, path.join(project, 'themes', 'alias'));
  ctx.options.theme = 'alias';
  assert.equal(await renderTheme(ctx, 'say', 'list'), 'inside');
  await fs.mkdir(path.join(project, 'outside-theme'));
  await fs.symlink(path.join(project, 'outside-theme'), path.join(project, 'themes', 'escape'));
  ctx.options.theme = 'escape';
  await assert.rejects(renderTheme(ctx, 'say', 'list'), /escapes/);
});

test('permission errors are not treated as an absent override', async t => {
  const {ctx} = await fixture(t);
  const original = fs.realpath;
  const denied = Object.assign(new Error('permission denied'), {code: 'EACCES'});
  t.mock.method(fs, 'realpath', async file => {
    if (file.endsWith('/plugins/say/list.eta')) throw denied;
    return original(file);
  });
  await assert.rejects(renderTheme(ctx, 'say', 'list'), error => error === denied);
});
