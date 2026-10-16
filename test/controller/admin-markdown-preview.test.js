const test = require('node:test');
const assert = require('node:assert/strict');

global.think = global.think || {};
think.Controller = class {};

const MarkdownController = require('../../src/controller/admin/api/markdown');

function createController({input, rendered = '<p>preview</p>'}) {
  const controller = Object.create(MarkdownController.prototype);
  let renderedPost;
  const postModel = {
    async renderContent(post) {
      renderedPost = post;
      return {content: rendered};
    }
  };
  controller.post = () => input;
  controller.model = name => {
    assert.equal(name, 'post');
    return postModel;
  };
  controller.success = data => ({errno: 0, data});
  controller.fail = error => ({errno: 1, error});
  return {controller, getRenderedPost: () => renderedPost};
}

test('admin Markdown preview uses the post model content rendering pipeline', async() => {
  const fixture = createController({
    input: {type: '0', markdown_content: '# Draft'}
  });

  const result = await fixture.controller.postAction();
  assert.deepEqual(result, {errno: 0, data: {html: '<p>preview</p>'}});
  assert.deepEqual(fixture.getRenderedPost(), {
    type: 0, markdown_content: '# Draft'
  });
});

test('admin Markdown preview validates its rendering inputs', async() => {
  const fixture = createController({
    input: {type: 1, markdown_content: 'Page'}
  });
  await fixture.controller.postAction();
  assert.deepEqual(fixture.getRenderedPost(), {
    type: 1, markdown_content: 'Page'
  });

  fixture.controller.post = () => ({type: 3, markdown_content: 'Invalid'});
  assert.deepEqual(await fixture.controller.postAction(), {errno: 1, error: 'PARAMS_ERROR'});
});
