const assert = require('node:assert/strict');
const test = require('node:test');
const {
  Widget,
  WidgetFactory,
  registerWidget,
  registerWidgetMap
} = require('../../src/common/widget/registry');

let id = 0;
function uniqueName() {
  id += 1;
  return `Test_Widget_${id}`;
}

test('registry validates and protects registrations', () => {
  const name = uniqueName();
  class Example extends Widget {}
  class Replacement extends Widget {}

  assert.equal(registerWidget(name, Example), Example);
  assert.throws(() => registerWidget(name, Example), /already registered/);
  assert.equal(registerWidget(name, Replacement, {override: true}), Replacement);
  assert.throws(() => registerWidget(uniqueName(), class {}), /must extend/);
});

test('registry automatically registers an explicit widget map', async() => {
  class AutoWidget extends Widget {}
  assert.deepEqual(registerWidgetMap({Test_Auto_Widget: AutoWidget}), ['Test_Auto_Widget']);

  const factory = new WidgetFactory({ctx: {}, model() {}});
  const widget = await factory.widget('Test_Auto_Widget');
  assert.equal(widget.constructor, AutoWidget);
});

test('factory awaits lifecycle and caches by request and complete widget name', async() => {
  const name = uniqueName();
  const calls = [];
  class Example extends Widget {
    async init() { calls.push('init') }
    async execute() {
      calls.push('execute');
      this.push({value: this.parameter.value});
    }
  }
  registerWidget(name, Example);
  const controller = {ctx: {}, model() {}};
  const firstFactory = new WidgetFactory(controller);

  const first = await firstFactory.widget(name, {value: 1});
  const cached = await firstFactory.widget(name, {value: 1});
  const differentParams = await firstFactory.widget(name, {value: 2});
  const alias = await firstFactory.widget(`${name}@sidebar`, {value: 1});
  const otherRequest = await new WidgetFactory(controller).widget(name, {value: 1});

  assert.equal(first, cached);
  assert.equal(first, differentParams);
  assert.equal(differentParams.value, 1);
  assert.notEqual(first, alias);
  assert.notEqual(first, otherRequest);
  assert.deepEqual(calls, ['init', 'execute', 'init', 'execute', 'init', 'execute']);
});

test('factory aliases and destroy create fresh widget instances', async() => {
  const name = uniqueName();
  let executions = 0;
  class Example extends Widget {
    async execute() {
      executions += 1;
      this.push({value: this.parameter.value});
    }
  }
  registerWidget(name, Example);
  const factory = new WidgetFactory({ctx: {}, model() {}});

  const first = await factory.widget(name, {value: 1});
  const alias = await factory.widget(`${name}@refresh`, {value: 2});
  factory.destroy(name);
  const refreshed = await factory.widget(name, {value: 3});

  assert.notEqual(first, alias);
  assert.notEqual(first, refreshed);
  assert.equal(alias.value, 2);
  assert.equal(refreshed.value, 3);
  assert.equal(executions, 3);

  factory.destroy();
  assert.equal(factory.pool.size, 0);
});

test('factory validates parameters and reports execution errors', async() => {
  const name = uniqueName();
  const original = new Error('database unavailable');
  class Broken extends Widget {
    async execute() { throw original }
  }
  registerWidget(name, Broken);
  const factory = new WidgetFactory({ctx: {}, model() {}});

  await assert.rejects(factory.widget('Missing_Widget'), /not registered/);
  await assert.rejects(factory.widget(name, 'pageSize=10'), /parameters must be an object/);
  await assert.rejects(factory.widget(name), error => {
    assert.match(error.message, new RegExp(name));
    assert.equal(error.cause, original);
    return true;
  });
});
