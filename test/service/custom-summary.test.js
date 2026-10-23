'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

global.think = {Model: class {}};
const Post = require('../../src/model/post');

test('custom summary survives rendering and clearing restores automatic excerpt', async() => {
  const post = new Post();
  post.model = () => ({getOptions: async() => ({auto_summary: 100})});
  post.renderContent = async() => ({markdown: 'body', content: '<p>body</p>'});
  post.markdownToHtml = async text => `<p>${text}</p>`;
  post.getSummary = async() => 'automatic';
  const custom = await post.getContentAndSummary({options: JSON.stringify({customSummary: 'overview'})});
  assert.equal(custom.summary, '<p>overview</p>');
  const automatic = await post.getContentAndSummary({options: {customSummary: ''}});
  assert.equal(automatic.summary, 'automatic');
});
test('changing automatic excerpt length preserves custom summaries', async() => {
  const post = new Post();
  post.field = () => ({setRelation: () => ({select: async() => [
    {id: 1, markdown_content: 'body', options: '{"customSummary":"custom"}'},
    {id: 2, markdown_content: 'body', options: '{}'}
  ]})});
  const updates = [];
  post.where = ({id}) => ({update: async data => updates.push({id, ...data})});
  post.getSummary = async() => 'automatic';
  await post.updateAllPostSummaries();
  assert.deepEqual(updates, [{id: 2, summary: 'automatic'}]);
});
