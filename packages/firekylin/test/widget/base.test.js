const assert = require('node:assert/strict');
const test = require('node:test');
const Widget = require('../../src/widget/base');

test('Widget exposes and resets its data stack', () => {
  const widget = new Widget({ctx: {}, model() {}}, {});
  widget.pushAll([{name: 'first', count: 1}, {name: 'second', count: 2}]);

  assert.equal(widget.have(), true);
  assert.equal(widget.length, 2);
  assert.equal(widget.next().name, 'first');
  assert.equal(widget.name, 'first');
  assert.equal(widget.sequence, 1);
  assert.deepEqual(widget.toColumn(['name', 'count']), {name: 'first', count: 1});
  assert.equal(widget.next().name, 'second');
  assert.equal(widget.next(), false);
  assert.equal(widget.sequence, 0);
  assert.equal(widget.next().name, 'first');
});

test('Widget converts rows and parses templates', () => {
  const widget = new Widget({ctx: {}, model() {}}, {});
  widget.pushAll([{name: 'one'}, {name: 'two'}]);

  assert.deepEqual(widget.toArray('name'), ['one', 'two']);
  assert.equal(widget.parse('<{name}>'), '<one><two>');
});

test('Widget validates pushed data', () => {
  const widget = new Widget({ctx: {}, model() {}}, {});
  assert.throws(() => widget.push(null), /must be objects/);
  assert.throws(() => widget.pushAll({}), /must be an array/);
});
