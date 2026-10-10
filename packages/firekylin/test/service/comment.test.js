'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

let requestHandler;
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request !== 'request') {
    return originalLoad.call(this, request, parent, isMain);
  }
  return {
    defaults() {
      const get = (options, callback) => {
        requestHandler(options, callback);
      };
      get.post = () => {};
      return get;
    }
  };
};

global.think = {
  Service: class {},
  isEmpty: value => !value || Object.keys(value).length === 0,
  promisify: (fn, receiver) => (...args) => new Promise((resolve, reject) => {
    fn.call(receiver, ...args, (error, response) => error ? reject(error) : resolve(response));
  })
};

const CommentService = require('../../src/service/comment');
Module._load = originalLoad;

test('syncs Waline comment counts using Firekylin post paths', async() => {
  let requestedOptions;
  requestHandler = (options, callback) => {
    requestedOptions = options;
    callback(null, {body: JSON.stringify([3, 0, 8])});
  };
  const updates = [];
  let cacheClears = 0;
  const service = Object.create(CommentService.prototype);
  service.getPostData = async() => ({
    first: {id: 1, pathname: 'hello', comment_num: 1, type: 0},
    second: {id: 2, pathname: 'about', comment_num: 0, type: 1},
    third: {id: 3, pathname: 'nested/path', comment_num: 2, type: 0}
  });
  service.model = () => ({
    where(where) {
      return {
        update: async data => updates.push({where, data})
      };
    }
  });
  service.clearPostCache = async() => { cacheClears++ };

  await service.syncFromWaline({
    name: JSON.stringify({serverURL: 'https://comments.example.com/'})
  });

  assert.equal(requestedOptions.url, 'https://comments.example.com/api/comment');
  assert.deepEqual(requestedOptions.qs, {
    type: 'count',
    url: '/post/hello.html,/page/about.html,/post/nested/path.html'
  });
  assert.deepEqual(updates, [
    {where: {id: 1}, data: {comment_num: 3}},
    {where: {id: 3}, data: {comment_num: 8}}
  ]);
  assert.equal(cacheClears, 1);
});

test('accepts the Waline response envelope', async() => {
  requestHandler = (options, callback) => {
    callback(null, {body: JSON.stringify({errno: 0, data: [5]})});
  };
  let count;
  const service = Object.create(CommentService.prototype);
  service.getPostData = async() => ({post: {id: 9, pathname: 'post', comment_num: 0, type: 0}});
  service.model = () => ({where: () => ({update: async data => { count = data.comment_num }})});
  service.clearPostCache = async() => {};

  await service.syncFromWaline({name: JSON.stringify({serverURL: 'https://comments.example.com'})});
  assert.equal(count, 5);
});

test('renders the pathname placeholder in a custom Waline path template', async() => {
  let requestedOptions;
  requestHandler = (options, callback) => {
    requestedOptions = options;
    callback(null, {body: JSON.stringify([2])});
  };
  const service = Object.create(CommentService.prototype);
  service.getPostData = async() => ({post: {id: 9, pathname: 'post', comment_num: 2, type: 0}});
  service.model = () => ({where: () => ({update: async() => {}})});
  service.clearPostCache = async() => {};

  await service.syncFromWaline({
    name: JSON.stringify({
      serverURL: 'https://comments.example.com',
      path: '/comments/${pathname}/${pathname}'
    })
  });

  assert.equal(requestedOptions.qs.url, '/comments/post/post');
});
