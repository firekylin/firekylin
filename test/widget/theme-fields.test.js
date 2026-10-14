const assert = require('node:assert/strict');
const test = require('node:test');
const ContentsWidget = require('../../src/widget/base/contents');

test('content widgets expose theme fields stored in post options', () => {
  const widget = new ContentsWidget({ctx: {}, model() {}}, {});
  widget.push({
    pathname: 'hello',
    options: JSON.stringify({fields: {subtitle: 'Hello', layout: 'wide'}})
  });
  widget.next();

  assert.deepEqual(widget.fields, {subtitle: 'Hello', layout: 'wide'});
  assert.equal(widget.fields.subtitle, 'Hello');
});

test('content widgets use an empty field map for legacy posts', () => {
  const widget = new ContentsWidget({ctx: {}, model() {}}, {});
  widget.push({pathname: 'legacy', options: '{}'});
  widget.next();

  assert.deepEqual(widget.fields, {});
});
