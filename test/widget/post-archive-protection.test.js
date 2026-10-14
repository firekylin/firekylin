'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

global.think = {
  Model: class {},
  extend(...values) { return Object.assign({}, ...values) },
  datetime(value, format) { return format === 'YYYY年MM月' ? '2026年10月' : value || '2026-10-14 00:00:00' }
};

const Post = require('../../src/model/post');

function modelWith(rows) {
  const model = Object.create(Post.prototype);
  for (const method of ['field', 'order', 'setRelation', 'where']) model[method] = () => model;
  model.select = async() => rows.map(row => ({...row}));
  return model;
}

test('archive list redacts titles and metadata for password-protected posts', async() => {
  const model = modelWith([
    {id: 1, title: 'Secret title', pathname: 'secret', create_time: '2026-10-14 12:00:00',
      options: JSON.stringify({postPasswordHash: 'scrypt$salt$hash', featuredImage: 'cover.jpg'})},
    {id: 2, title: 'Public title', pathname: 'public', create_time: '2026-10-13 12:00:00', options: '{}'}
  ]);

  const archive = await model.getPostArchive();
  assert.equal(archive['2026年10月'][0].title, '此内容被密码保护');
  assert.equal(archive['2026年10月'][0].summary, '这篇文章受密码保护。');
  assert.equal(archive['2026年10月'][0].content, '这篇文章受密码保护。');
  assert.equal(archive['2026年10月'][0].options.postPasswordHash, undefined);
  assert.equal(archive['2026年10月'][0].options.featuredImage, 'cover.jpg');
  assert.equal(archive['2026年10月'][1].title, 'Public title');
});
