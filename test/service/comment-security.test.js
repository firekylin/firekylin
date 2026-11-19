'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

global.think = {Service: class {}};
global.firekylin = {POST_PUBLISH: 3, POST_PUBLIC: 1, POST_ALLOW_COMMENT: 1};
const CommentService = require('../../src/service/comment');
const {pathnameFromUrl, renderMarkdown, resolveCommentPostId} = require('../../src/service/comment');

test('comment markdown removes unsafe links and image sources', async() => {
  const output = await renderMarkdown([
    '[unsafe](javascript:alert(1))',
    '[encoded](javascript&#58;alert(1))',
    '![image](data:text/html;base64,PHNjcmlwdD4=)',
    '[safe](https://example.com/path)'
  ].join('\n\n'));

  assert.doesNotMatch(output, /javascript:|data:text\/html/i);
  assert.doesNotMatch(output, /<a href="[^"]*">unsafe<\/a>/);
  assert.match(output, /href="https:\/\/example\.com\/path"/);
});

test('comment markdown escapes raw HTML while preserving safe formatting', async() => {
  const output = await renderMarkdown('<script>alert(1)</script> **bold** ![pixel](data:image/png;base64,AA==)');
  assert.doesNotMatch(output, /<script>/);
  assert.match(output, /&lt;script&gt;/);
  assert.match(output, /<strong>bold<\/strong>/);
  assert.match(output, /src="data:image\/png;base64,AA=="/);
  assert.match(output, /alt="pixel"/);
});

test('comment markdown preserves task lists and image alt text', async() => {
  const output = await renderMarkdown('- [x] done\n\n![description](https://example.com/a.png)');
  assert.match(output, /type="checkbox"[^>]*checked/);
  assert.match(output, /alt="description"/);
});

test('comment markdown automatically links safe bare URLs', async() => {
  const output = await renderMarkdown('Visit https://example.com/path');
  assert.match(output, /<a href="https:\/\/example\.com\/path">https:\/\/example\.com\/path<\/a>/);
});

test('comment paths decode browser-encoded post pathnames', () => {
  assert.deepEqual(pathnameFromUrl('/post/%E4%B8%AD%E6%96%87.html'), {pathname: '中文'});
  assert.deepEqual(pathnameFromUrl('/page/about.html'), {pathname: 'about'});
  assert.equal(pathnameFromUrl('/post/%E4.html'), null);
});

test('comment URL resolution ignores unpublished permalink collisions', async() => {
  const rows = [
    {id: 7, type: 0, pathname: 'same', status: 3, is_public: 1},
    {id: 8, type: 1, pathname: 'same', status: 0, is_public: 1}
  ];
  global.think.isEmpty = value => !value || !Object.keys(value).length;
  const controller = {model: () => {
    let where;
    return {
      where(value) { where = value; return this },
      field() { return this },
      limit() { return this },
      async select() {
        return rows.filter(row => Object.entries(where).every(([key, value]) => row[key] === value));
      }
    };
  }};
  const options = {post_permalink: '/{slug}.html', page_permalink: '/{slug}.html'};
  assert.equal(await resolveCommentPostId(controller, '/same.html', options), 7);
});

test('comment input enforces configured length and anonymous metadata', () => {
  const service = new CommentService();
  const anonymous = {state: {}};
  const signedIn = {state: {userInfo: {objectId: '1'}}};
  const config = {wordLimit: [2, 5], requiredMeta: ['nick', 'mail']};

  assert.throws(() => service.validateCommentInput({comment: 'a', nick: 'A', mail: 'a@example.com'}, anonymous, config),
    error => error.code === 'VALIDATION_ERROR' && error.details.min === 2);
  assert.throws(() => service.validateCommentInput({comment: 'hello', nick: 'A'}, anonymous, config),
    error => error.code === 'VALIDATION_ERROR' && error.details.field === 'mail');
  assert.doesNotThrow(() => service.validateCommentInput({comment: 'hello'}, signedIn, config));
});

function targetController(rows, options = {}) {
  const queries = [];
  const updates = [];
  return {
    queries,
    updates,
    ctx: {},
    model(name) {
      if (name === 'options') return {getOptions: async() => options};
      let where;
      let limit;
      return {
        where(value) {
          where = value;
          queries.push({name, where});
          return this;
        },
        limit(value) {
          limit = value;
          return this;
        },
        async select() {
          return rows.filter(row => Object.entries(where).every(([key, value]) => row[key] === value)).slice(0, limit);
        },
        async count() {
          return 4;
        },
        async update(patch) {
          updates.push({where, patch});
        }
      };
    },
    service() {
      return {hasCommentAccess: () => false};
    }
  };
}

const published = {id: 21, type: 3, pathname: 'say-example', status: 3, is_public: 1, allow_comment: 1};

test('Explicit pathnames use the same native target for reads and writes without a type filter', async() => {
  const controller = targetController([published]);
  const service = new CommentService();
  for (const url of ['/path?pathname=say-example', '/path?pathname=say-example#comments', '/post/say-example.html']) {
    assert.equal(await resolveCommentPostId(controller, url), 21);
    assert.equal((await service.validateCommentTarget(controller, url)).id, 21);
  }
  assert.ok(controller.queries.every(query => !Object.hasOwn(query.where, 'type')));
});

test('Explicit paths preserve literal html suffixes and decode once without treating IDs as pathnames', async() => {
  assert.deepEqual(pathnameFromUrl('/path?pathname=%E4%B8%AD%E6%96%87.html'), {pathname: '中文.html'});
  assert.deepEqual(pathnameFromUrl('/path?pathname=a%252Fb'), {pathname: 'a%2Fb'});
  const controller = targetController([published]);
  assert.equal(await resolveCommentPostId(controller, '/path?pathname=21'), null);
  assert.equal(await resolveCommentPostId(controller, '/path?pathname=%E4'), null);
  await assert.rejects(new CommentService().validateCommentTarget(controller, '/path?pathname=%E4'),
    error => error.code === 'INVALID_PATH');
});

test('duplicate public pathnames reject reads and writes even across types or comment flags', async() => {
  for (const allow_comment of [0, 1]) {
    const controller = targetController([published, {...published, id: 22, type: 0, allow_comment}]);
    assert.equal(await resolveCommentPostId(controller, '/path?pathname=say-example'), null);
    await assert.rejects(new CommentService().validateCommentTarget(controller, '/path?pathname=say-example'),
      error => error.code === 'INVALID_PATH' && error.status === 409);
  }
});

test('unpublished and private plugin targets stay inaccessible', async() => {
  for (const patch of [{status: 0}, {is_public: 0}]) {
    const controller = targetController([{...published, ...patch}]);
    assert.equal(await resolveCommentPostId(controller, '/path?pathname=say-example'), null);
    await assert.rejects(new CommentService().validateCommentTarget(controller, '/path?pathname=say-example'),
      error => error.code === 'COMMENT_DISABLED');
  }
});

test('closed and password-protected plugin targets still reject comment submission', async() => {
  const service = new CommentService();
  for (const patch of [{allow_comment: 0}, {options: {postPasswordHash: 'protected'}}]) {
    const controller = targetController([{...published, ...patch}]);
    await assert.rejects(service.validateCommentTarget(controller, '/path?pathname=say-example'),
      error => error.code === 'COMMENT_DISABLED');
  }
});

test('custom slug and numeric ID permalinks locate plugin records without requiring article type', async() => {
  const service = new CommentService();
  for (const [post_permalink, url] of [['/notes/{slug}', '/notes/say-example'], ['/entry/{id}', '/entry/21']]) {
    const options = {post_permalink};
    const controller = targetController([published], options);
    assert.equal(await resolveCommentPostId(controller, url, options), 21);
    assert.equal((await service.validateCommentTarget(controller, url)).id, 21);
  }
});

test('overlapping custom permalink candidates reject different records', async() => {
  const options = {post_permalink: '/entry/{slug}', page_permalink: '/entry/{id}'};
  const controller = targetController([published, {...published, id: 22, pathname: '21'}], options);
  assert.equal(await resolveCommentPostId(controller, '/entry/21', options), null);
  await assert.rejects(new CommentService().validateCommentTarget(controller, '/entry/21'),
    error => error.code === 'INVALID_PATH' && error.status === 409);
});

test('comment count synchronization uses the same pathname and ID resolution and skips ambiguity', async() => {
  global.think.cache = async() => {};
  const service = new CommentService();
  for (const url of ['/path?pathname=say-example', '/entry/21']) {
    const controller = targetController([published], {post_permalink: '/entry/{id}'});
    await service.syncCount(controller, url);
    assert.deepEqual(controller.updates, [{where: {id: 21}, patch: {comment_num: 4}}]);
  }
  const controller = targetController([published, {...published, id: 22}]);
  await service.syncCount(controller, '/path?pathname=say-example');
  assert.deepEqual(controller.updates, []);
});

test('explicit type disambiguates pathnames and constrains reads, writes and counts', async() => {
  const controller = targetController([published, {...published, id: 22, type: 0}]);
  const service = new CommentService();
  for (const [type, id] of [[3, 21], [0, 22]]) {
    const url = `/path?pathname=say-example&type=${type}`;
    assert.equal(await resolveCommentPostId(controller, url), id);
    assert.equal((await service.validateCommentTarget(controller, url)).id, id);
    await service.syncCount(controller, url);
    assert.equal(controller.updates.at(-1).where.id, id);
  }
  assert.equal(await resolveCommentPostId(controller, '/path?pathname=say-example&type=1'), null);
  await assert.rejects(service.validateCommentTarget(controller, '/path?pathname=say-example&type=1'),
    error => error.code === 'COMMENT_DISABLED');
  const duplicate = targetController([published, {...published, id: 23}]);
  assert.equal(await resolveCommentPostId(duplicate, '/path?pathname=say-example&type=3'), null);
});

test('invalid explicit parameters cannot fall back to an ordinary permalink', async() => {
  const options = {post_permalink: '/{slug}'};
  const controller = targetController([{...published, pathname: 'path'}], options);
  for (const url of [
    '/path?type=3', '/path?pathname=', '/path?pathname=%20', '/path?pathname=%00',
    '/path?pathname=%E4', '/path?pathname=%ZZ', '/path?pathname=a&pathname=b',
    '/path?pathname=a&type=', '/path?pathname=a&type=-1', '/path?pathname=a&type=1.5',
    '/path?pathname=a&type=abc', '/path?pathname=a&type=9007199254740992',
    '/path?pathname=a&type=3&type=0'
  ]) {
    assert.equal(pathnameFromUrl(url, options), null, url);
    assert.equal(await resolveCommentPostId(controller, url, options), null, url);
    await assert.rejects(new CommentService().validateCommentTarget(controller, url),
      error => error.code === 'INVALID_PATH');
  }
  assert.equal(controller.queries.length, 0);
});

test('explicit pathnames preserve encoded delimiters and do not imply plugin routing', async() => {
  assert.deepEqual(pathnameFromUrl('/path?type=3&pathname=a%2Fb%3Fc%23d%26e%2Bf'),
    {pathname: 'a/b?c#d&e+f', type: 3});
  const controller = targetController([published]);
  assert.equal(pathnameFromUrl('/says/say-example'), null);
  assert.equal(await resolveCommentPostId(controller, '/says/say-example'), null);
});

test('explicit query parameters override URL routing regardless of prefix', async() => {
  const controller = targetController([published]);
  for (const prefix of ['/says', '/says1', '/anything/nested', '/post/other.html', '/page/other.html']) {
    const url = `${prefix}?pathname=say-example&type=3#comments`;
    assert.deepEqual(pathnameFromUrl(url), {pathname: 'say-example', type: 3});
    assert.equal(await resolveCommentPostId(controller, url), 21);
    assert.equal((await new CommentService().validateCommentTarget(controller, url)).id, 21);
    assert.equal(await resolveCommentPostId(controller, `${prefix}?pathname=&type=3`), null);
  }
  assert.deepEqual(pathnameFromUrl('/post/article.html?page=2'), {pathname: 'article'});
  assert.deepEqual(pathnameFromUrl('/path', {post_permalink: '/{slug}'}), {pathname: 'path'});
  assert.equal(pathnameFromUrl('/post/article.html?type=3'), null);
});

test('legacy post/page URLs fall back to configured ID permalinks when pathname is absent', async() => {
  const service = new CommentService();
  global.think.cache = async() => {};
  for (const prefix of ['post', 'page']) {
    const options = {[`${prefix}_permalink`]: `/${prefix}/{id}.html`};
    const controller = targetController([published], options);
    const url = `/${prefix}/21.html`;
    assert.equal(await resolveCommentPostId(controller, url, options), 21);
    assert.equal((await service.validateCommentTarget(controller, url)).id, 21);
    await service.syncCount(controller, url);
    assert.deepEqual(controller.updates, [{where: {id: 21}, patch: {comment_num: 4}}]);
  }
});

test('legacy fallback preserves direct matches and never rescues ambiguous or explicit targets', async() => {
  const options = {post_permalink: '/post/{id}.html'};
  const direct = {...published, id: 22, pathname: '21'};
  const controller = targetController([published, direct], options);
  assert.equal(await resolveCommentPostId(controller, '/post/21.html', options), 22);
  assert.equal((await new CommentService().validateCommentTarget(controller, '/post/21.html')).id, 22);
  const duplicate = targetController([published, direct, {...direct, id: 23}], options);
  assert.equal(await resolveCommentPostId(duplicate, '/post/21.html', options), null);
  await assert.rejects(new CommentService().validateCommentTarget(duplicate, '/post/21.html'),
    error => error.code === 'INVALID_PATH' && error.status === 409);
  for (const url of ['/post/21.html?pathname=missing&type=3', '/post/21.html?pathname=&type=3']) {
    assert.equal(await resolveCommentPostId(controller, url, options), null);
    await assert.rejects(new CommentService().validateCommentTarget(controller, url));
  }
});
