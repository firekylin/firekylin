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
test('submitted summary is used directly without duplicating its content', async() => {
  const post = model();
  post.getSummary = async() => { throw new Error('Explicit summary must not be regenerated') };
  const result = await post.getContentAndSummary({summary: 'overview', options: '{}'});
  assert.equal(result.summary, 'overview');
  assert.equal(JSON.parse(result.options).summaryCustomized, true);
});
test('empty, whitespace-only and omitted summaries fall back to getSummary', async() => {
  for (const summary of ['', '  ', undefined, null]) {
    const result = await model().getContentAndSummary({summary, options: '{}'});
    assert.equal(result.summary, 'automatic');
  }
});
test('bulk rebuilding preserves customized summaries and regenerates automatic ones', async() => {
  const post = model();
  post.field = () => ({setRelation: () => ({select: async() => [
    {id: 1, markdown_content: 'body', summary: 'custom summary', options: '{"summaryCustomized":true}'},
    {id: 2, markdown_content: 'body', summary: 'old automatic summary', options: '{}'}
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
  assert.equal(JSON.parse(saved.options).summaryCustomized, true);
  await service.update({id: 1, markdown_content: 'new body', summary: ''}, {id: 1, type: 1});
  assert.equal(saved.summary, 'automatic');
  assert.equal(JSON.parse(saved.options).summaryCustomized, false);
});
test('automatic excerpts follow changed openings and moved more markers', async() => {
  const post = model();
  post.renderContent = async data => ({markdown: data.markdown_content, content: data.markdown_content});
  post.getSummary = Post.prototype.getSummary;
  post.markdownToHtml = async text => text;
  const edited = await post.getContentAndSummary({markdown_content: 'new opening\n<!--more-->\nrest', options: '{}'});
  assert.equal(edited.summary, 'new opening\n');
  const moved = await post.getContentAndSummary({markdown_content: 'new opening\nextra paragraph\n<!--more-->\nrest',
    options: edited.options});
  assert.equal(moved.summary, 'new opening\nextra paragraph\n');
});
