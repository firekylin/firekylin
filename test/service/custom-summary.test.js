'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

global.think = {Model: class {}};
const Post = require('../../src/model/post');

function model() {
  const post = new Post();
  post.model = () => ({getOptions: async() => ({auto_summary: 100})});
  post.renderContent = async() => ({markdown: 'body', content: '<p>body</p>'});
  post.getSummary = async() => 'automatic';
  return post;
}
test('submitted summary is used directly without rendering or storing another field', async() => {
  const post = model();
  post.getSummary = async() => { throw new Error('Explicit summary must not be regenerated') };
  const result = await post.getContentAndSummary({summary: 'overview', options: '{}'});
  assert.equal(result.summary, 'overview');
  assert.equal(result.options, '{}');
});
test('empty, whitespace-only and omitted summaries fall back to getSummary', async() => {
  for (const summary of ['', '  ', undefined, null]) {
    const result = await model().getContentAndSummary({summary, options: '{}'});
    assert.equal(result.summary, 'automatic');
  }
});
test('bulk rebuilding preserves existing summaries and only fills empty ones', async() => {
  const post = model();
  post.field = () => ({setRelation: () => ({select: async() => [
    {id: 1, markdown_content: 'body', summary: 'existing summary'},
    {id: 2, markdown_content: 'body', summary: ''}
  ]})});
  const updates = [];
  post.where = ({id}) => ({update: async data => updates.push({id, ...data})});
  await post.updateAllPostSummaries();
  assert.deepEqual(updates, [{id: 2, summary: 'automatic'}]);
});
test('updating body uses only the submitted summary rather than inheriting the old one', async() => {
  const PostCommandService = require('../../src/service/post-command');
  const post = model();
  post.where = () => post;
  post.setRelation = () => post;
  post.find = async() => ({id: 1, user_id: 1, status: 0, summary: 'old summary', options: '{}'});
  let saved;
  post.savePost = async data => { saved = data; return 1 };
  const service = new PostCommandService({getModel: () => post, now: () => 'now'});
  await service.update({id: 1, markdown_content: 'new body'}, {id: 1, type: 1});
  assert.equal(saved.summary, 'automatic');
  await service.update({id: 1, markdown_content: 'new body', summary: 'submitted summary'}, {id: 1, type: 1});
  assert.equal(saved.summary, 'submitted summary');
  await service.update({id: 1, markdown_content: 'new body', summary: ''}, {id: 1, type: 1});
  assert.equal(saved.summary, 'automatic');
});
