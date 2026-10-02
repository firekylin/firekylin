const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  Widget,
  WidgetFactory,
  loadProjectWidgets,
  loadThemeWidgets,
  registerWidget
} = require('../../src/common/widget/registry');

let sequence = 0;
function name(label) {
  sequence += 1;
  return `Test_Extension_${label}_${sequence}`;
}

function temporaryDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-widget-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  return directory;
}

function write(file, contents) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, contents);
}

function controller(rows = []) {
  return {
    ctx: {},
    model(modelName) {
      assert.equal(modelName, 'post');
      return {async select() { return rows }};
    }
  };
}

test('project extensions receive the public Widget API and can query models', async(t) => {
  const root = temporaryDirectory(t);
  const widgetName = name('Project');
  write(path.join(root, 'widgets.js'), `
    module.exports = ({Widget}) => ({
      ${widgetName}: class extends Widget {
        async execute() {
          const rows = await this.model('post').select();
          this.pushAll(rows.map(row => ({...row, limit: this.parameter.limit})));
        }
      }
    });
  `);

  assert.deepEqual(loadProjectWidgets({
    projectPath: root,
    config: {widgets: ['./widgets.js']}
  }), [widgetName]);
  const widget = await new WidgetFactory(controller([{title: 'Extension'}]))
    .widget(widgetName, {limit: 3});
  assert.deepEqual(widget.stack, [{title: 'Extension', limit: 3}]);
});

test('project overrides must be explicitly declared', async(t) => {
  const root = temporaryDirectory(t);
  const widgetName = name('ProjectOverride');
  class CoreWidget extends Widget {}
  registerWidget(widgetName, CoreWidget, {source: 'test core'});
  write(path.join(root, 'widgets.js'), `
    module.exports = ({Widget}) => ({'${widgetName}@replacement': class extends Widget {
      async execute() { this.push({source: 'project'}); }
    }});
  `);

  assert.throws(() => loadProjectWidgets({
    projectPath: root,
    config: {widgets: ['./widgets.js']}
  }), /already registered by test core/);
  loadProjectWidgets({
    projectPath: root,
    config: {widgets: ['./widgets.js'], widgetOverrides: [widgetName]}
  });
  const widget = await new WidgetFactory(controller()).widget(widgetName);
  assert.equal(widget.row.source, 'project');
});

test('only the selected theme is loaded and its registrations are request scoped', async(t) => {
  const root = temporaryDirectory(t);
  const widgetName = name('Theme');
  const first = path.join(root, 'first');
  const second = path.join(root, 'second');
  write(path.join(first, 'package.json'), JSON.stringify({
    firekylin: {widgets: './widgets.js'}
  }));
  write(path.join(first, 'widgets.js'), `
    global.__firekylinFirstThemeLoaded = true;
    module.exports = ({Widget}) => ({${widgetName}: class extends Widget {
      async execute() { this.push({theme: 'first'}); }
    }});
  `);
  write(path.join(second, 'package.json'), JSON.stringify({
    firekylin: {widgets: './widgets.js'}
  }));
  write(path.join(second, 'widgets.js'), `
    global.__firekylinSecondThemeLoaded = true;
    module.exports = ({Widget}) => ({${widgetName}: class extends Widget {
      async execute() { this.push({theme: 'second'}); }
    }});
  `);
  delete global.__firekylinFirstThemeLoaded;
  delete global.__firekylinSecondThemeLoaded;

  const firstFactory = new WidgetFactory(controller());
  firstFactory.useTheme(root, 'first');
  assert.equal(global.__firekylinFirstThemeLoaded, true);
  assert.equal(global.__firekylinSecondThemeLoaded, undefined);
  assert.equal((await firstFactory.widget(widgetName)).row.theme, 'first');
  fs.renameSync(first, path.join(root, 'first-moved'));
  const cachedFactory = new WidgetFactory(controller());
  cachedFactory.useTheme(root, 'first');
  assert.equal((await cachedFactory.widget(widgetName)).row.theme, 'first');

  const secondFactory = new WidgetFactory(controller());
  secondFactory.useTheme(root, 'second');
  assert.equal((await secondFactory.widget(widgetName)).row.theme, 'second');
  await assert.rejects(new WidgetFactory(controller()).widget(widgetName), /not registered/);
});

test('theme overrides are explicit and Widget_Options cannot be overridden', async(t) => {
  const root = temporaryDirectory(t);
  const widgetName = name('ThemeOverride');
  registerWidget(widgetName, class extends Widget {}, {source: 'test core'});
  const theme = path.join(root, 'theme');
  write(path.join(theme, 'widgets.js'), `
    module.exports = ({Widget}) => ({${widgetName}: class extends Widget {}});
  `);
  write(path.join(theme, 'package.json'), JSON.stringify({
    firekylin: {widgets: './widgets.js'}
  }));
  assert.throws(() => loadThemeWidgets(root, 'theme'), /already registered by test core/);
  write(path.join(theme, 'package.json'), JSON.stringify({
    firekylin: {widgets: './widgets.js', widgetOverrides: [widgetName]}
  }));
  const factory = new WidgetFactory(controller());
  factory.useTheme(root, 'theme');
  assert.equal((await factory.widget(widgetName)).constructor.name, widgetName);

  const optionsTheme = path.join(root, 'options');
  write(path.join(optionsTheme, 'widgets.js'), `
    module.exports = ({Widget}) => ({Widget_Options: class extends Widget {}});
  `);
  write(path.join(optionsTheme, 'package.json'), JSON.stringify({
    firekylin: {widgets: './widgets.js', widgetOverrides: ['Widget_Options']}
  }));
  assert.throws(() => loadThemeWidgets(root, 'options'), /cannot register Widget_Options/);
});

test('extension paths and exports are validated with their source', (t) => {
  const root = temporaryDirectory(t);
  assert.throws(() => loadProjectWidgets({
    projectPath: root,
    config: {widgets: ['../outside.js']}
  }), /escapes its root/);
  const outside = temporaryDirectory(t);
  write(path.join(outside, 'linked.js'), 'module.exports = () => ({});');
  fs.symlinkSync(path.join(outside, 'linked.js'), path.join(root, 'linked.js'));
  assert.throws(() => loadProjectWidgets({
    projectPath: root,
    config: {widgets: ['./linked.js']}
  }), /symbolic link/);
  assert.throws(() => loadProjectWidgets({
    projectPath: root,
    config: {widgets: ['./missing.js']}
  }), /missing\.js/);

  write(path.join(root, 'invalid.js'), 'module.exports = {};');
  assert.throws(() => loadProjectWidgets({
    projectPath: root,
    config: {widgets: ['./invalid.js']}
  }), /must export an initializer function/);
  write(path.join(root, 'wrong-class.js'), 'module.exports = () => ({Bad_Widget: class {}});');
  assert.throws(() => loadProjectWidgets({
    projectPath: root,
    config: {widgets: ['./wrong-class.js']}
  }), /must extend the Widget base class/);
  write(path.join(root, 'throws.js'), 'module.exports = () => { throw new Error("broken extension"); };');
  assert.throws(() => loadProjectWidgets({
    projectPath: root,
    config: {widgets: ['./throws.js']}
  }), /throws\.js: broken extension/);
});
