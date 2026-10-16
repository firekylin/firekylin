const test = require('node:test');
const assert = require('node:assert/strict');

global.think = global.think || {};
think.Controller = class {};
think.isEmpty = value => !value || Object.keys(value).length === 0;

const MarkdownController = require('../../src/controller/admin/api/markdown');

function createController({input, userInfo, existingPost, rendered = '<p>preview</p>'}) {
  const controller = Object.create(MarkdownController.prototype);
  let renderedPost;
  const postModel = {
    where() { return this },
    setRelation() { return this },
    async find() { return existingPost || {} },
    async renderContent(post) {
      renderedPost = post;
      return {content: rendered};
    }
  };
  controller.userInfo = userInfo;
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
    input: {id: '12', type: '0', markdown_content: '# Draft'},
    userInfo: {id: 1, type: 1},
    existingPost: {id: 12, type: 0, user_id: 2, title: 'Existing'}
  });

  const result = await fixture.controller.postAction();
  assert.deepEqual(result, {errno: 0, data: {html: '<p>preview</p>'}});
  assert.deepEqual(fixture.getRenderedPost(), {
    id: 12, type: 0, user_id: 2, title: 'Existing', markdown_content: '# Draft'
  });
});

test('authors cannot preview another author\'s post context', async() => {
  const {controller} = createController({
    input: {id: '12', type: '0', markdown_content: '# Draft'},
    userInfo: {id: 1, type: 2},
    existingPost: {id: 12, type: 0, user_id: 2}
  });

  assert.deepEqual(await controller.postAction(), {errno: 1, error: 'USER_NO_PERMISSION'});
});

test('new post previews carry the current author context and validate input', async() => {
  const fixture = createController({
    input: {id: 0, type: 1, markdown_content: 'Page'},
    userInfo: {id: 7, type: 2}
  });
  await fixture.controller.postAction();
  assert.deepEqual(fixture.getRenderedPost(), {
    id: 0, type: 1, user_id: 7, markdown_content: 'Page'
  });

  fixture.controller.post = () => ({type: 3, markdown_content: 'Invalid'});
  assert.deepEqual(await fixture.controller.postAction(), {errno: 1, error: 'PARAMS_ERROR'});
});
