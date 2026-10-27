'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

global.think = {
  Service: class {},
  datetime() { return '2026-01-01 00:00:00' }
};

const ImportBase = require('../../src/service/import/base');
const ExportBase = require('../../src/service/export/base');
const WordPressImport = require('../../src/service/import/wordpress');

test('import base exposes the default imported-user password statically', () => {
  // ghost/wordpress 导入器通过 Base.DEFAULT_USER_PWD 静态读取；
  // 写成 prototype 时读到的是 undefined，导入用户会拿到 "undefined" 的哈希。
  assert.equal(typeof ImportBase.DEFAULT_USER_PWD, 'string');
  assert.equal(ImportBase.DEFAULT_USER_PWD, 'admin12345678');
  // 子类通过构造函数原型链继承静态属性。
  assert.equal(WordPressImport.DEFAULT_USER_PWD, 'admin12345678');
});

test('exports only articles, never pages or attachments', async() => {
  let capturedWhere;
  const service = Object.create(ExportBase.prototype);
  service.model = name => {
    assert.equal(name, 'post');
    return {
      where(where) {
        capturedWhere = where;
        return {select: async() => []};
      }
    };
  };

  await service.getPosts();

  assert.deepEqual(capturedWhere, {type: 0});
});

test('imports WordPress pages before reporting a count', async() => {
  const service = Object.create(WordPressImport.prototype);
  const written = [];
  service.userModelInstance = {
    where() {
      return {async find() { return {id: 7} } };
    }
  };
  service.pageModelInstance = {
    async addPost(page) {
      // 模拟真实入库的异步耗时：漏掉 await 时 getPages 会先返回。
      await new Promise(resolve => setTimeout(resolve, 5));
      written.push(page);
    }
  };
  service.toMarkdown = content => content;

  const count = await service.page({item: [{
    title: ['About'],
    'wp:post_type': ['page'],
    'dc:creator': ['admin'],
    'excerpt:encoded': [''],
    'content:encoded': ['<p>hello</p>'],
    'wp:post_name': ['about'],
    'wp:status': ['publish'],
    'wp:comment_status': ['open'],
    pubDate: ['2026-01-01 00:00:00'],
    'wp:post_date': ['2026-01-01 00:00:00']
  }]});

  assert.equal(count, 1);
  assert.equal(written.length, 1);
  assert.equal(written[0].pathname, 'about');
});
