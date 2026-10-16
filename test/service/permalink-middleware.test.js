'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const middleware = require('../../src/middleware/permalink');

test('custom permalink middleware rewrites a public content request internally', async() => {
  const rows = [
    {id: 7, type: 0, pathname: 'hello', create_time: '2025-01-02 00:00:00', status: 3, is_public: 1}
  ];
  global.think = {
    isEmpty: value => !value || !Object.keys(value).length,
    model(name) {
      if (name === 'options') return {getOptions: async() => ({
        post_permalink: '/{slug}.html', page_permalink: '/{slug}.html'
      })};
      let condition;
      return {
        where(value) { condition = value; return this },
        field() { return this },
        async find() {
          return rows.find(row => Object.entries(condition).every(([key, value]) => row[key] === value)) || {};
        }
      };
    }
  };
  const ctx = {method: 'GET', path: '/hello.html', url: '/hello.html?from=test', state: {}};
  let called = false;
  await middleware()(ctx, () => { called = true });

  assert.equal(called, true);
  assert.equal(ctx.path, '/post/hello.html');
  assert.equal(ctx.state.originalPermalink, '/hello.html?from=test');
});

test('custom permalink middleware leaves reserved and unknown routes untouched', async() => {
  let optionReads = 0;
  global.think = {model: () => ({async getOptions() { optionReads++; return {} }})};
  for (const path of ['/search.html', '/missing.html', '/admin', '/post/hello.html', '/page/about']) {
    const ctx = {method: 'GET', path, url: path, state: {}};
    await middleware()(ctx, () => {});
    assert.equal(ctx.path, path);
  }
  assert.equal(optionReads, 1);
});
