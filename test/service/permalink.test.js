'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const permalink = require('../../src/service/permalink');

test('permalinks generate and match Typecho-style route tokens', () => {
  const options = {
    post_permalink: '/{year}/{month}/{slug}.html',
    page_permalink: '/pages/{id}/{slug}'
  };
  const post = {id: 42, pathname: 'hello world', create_time: '2025-03-09 12:00:00'};

  assert.equal(permalink.generate('post', post, options), '/2025/03/hello%20world.html');
  assert.deepEqual(permalink.match('/2025/03/hello%20world.html', options), [{
    type: 0, params: {year: '2025', month: '03', slug: 'hello world'}
  }]);
  assert.equal(permalink.generate('page', post, options), '/pages/42/hello%20world');
});

test('permalink validation rejects unsafe and unusable patterns', () => {
  for (const pattern of [
    'post/{slug}', '/post/latest', '/post/{unknown}', '/post/{Slug}/{id}',
    '/post/{slug}?preview=1', '/admin/{slug}'
  ]) {
    assert.throws(() => permalink.validate(pattern), TypeError);
  }
  assert.equal(permalink.validate('//post/{slug}.html'), '/post/{slug}.html');
});

test('identical post and page patterns return both content candidates', () => {
  const options = {post_permalink: '/{slug}.html', page_permalink: '/{slug}.html'};
  assert.deepEqual(permalink.match('/about.html', options), [
    {type: 0, params: {slug: 'about'}},
    {type: 1, params: {slug: 'about'}}
  ]);
});

test('generated permalinks fall back when dynamic values collide with reserved routes', () => {
  const options = {post_permalink: '/{slug}', page_permalink: '/{slug}'};
  assert.equal(permalink.generate('post', {pathname: 'admin'}, options), '/post/admin.html');
  assert.equal(permalink.generate('page', {pathname: 'search'}, options), '/page/search.html');
  assert.equal(permalink.generate('post', {pathname: 'hello'}, options), '/hello');
});
