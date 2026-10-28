const assert = require('node:assert/strict');
const test = require('node:test');

global.think = {
  datetime(value, format) { return `${value}:${format || 'default'}` },
  isEmpty(value) {
    return value === null || typeof value === 'undefined' ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0);
  }
};

const Archive = require('../../src/widget/archive');

function createController({params = {}, models = {}, query = {}, services = {}, body = {}, method = 'GET'} = {}) {
  return {
    ctx: {path: '/posts', query, method},
    get(name) { return params[name] },
    model(name) { return models[name] },
    post(name) { return body[name] },
    service(name) { return services[name] }
  };
}

test('archive list exposes pagination, archive metadata and content formatters', async() => {
  const models = {
    tag: {
      where() { return this },
      async find() { return {name: 'Node.js', pathname: 'node js'} }
    },
    post: {
      async getPostList(page, where) {
        assert.equal(page, 2);
        assert.equal(where.tag, 'node js');
        return {
          currentPage: 2,
          totalPages: 3,
          count: 1,
          data: [{
            title: 'Hello World',
            pathname: 'hello world',
            summary: '<p>Hello</p>',
            comment_num: 2,
            options: '{"featuredImage":"cover.jpg"}',
            user: {name: 'author', display_name: 'Author'}
          }]
        };
      }
    }
  };
  const archive = new Archive(createController({params: {tag: 'node', page: 2}, models}), {type: 'index'});
  await archive.execute();
  archive.next();

  assert.equal(archive.archiveTitle, 'Node.js');
  assert.equal(archive.archiveSlug, 'node js');
  assert.equal(archive.pagination.totalPages, 3);
  assert.equal(archive.title(), 'Hello World');
  assert.equal(archive.title.val(), 'Hello World');
  assert.equal(archive.permalink, '/post/hello%20world.html');
  assert.equal(archive.row.featuredImage, 'cover.jpg');
  assert.equal(archive.author(), 'Author');
});

test('category archive exposes its description to themes', async() => {
  const models = {
    cate: {
      where() { return this },
      async find() { return {name: 'Guides', pathname: 'guides', description: 'Practical tutorials'} }
    },
    post: {
      async getPostList() { return {currentPage: 1, totalPages: 1, count: 0, data: []} }
    }
  };
  const controller = createController({params: {cate: 'guides'}, models});
  const archive = new Archive(controller, {type: 'index'});
  await archive.execute();

  assert.equal(archive.archiveDescription, 'Practical tutorials');
});

test('archive detail formats relations, content and permissions', async() => {
  const post = {
    async getPostDetail() {
      return {
        title: 'Detail',
        pathname: 'detail',
        content: '<p>Body</p>',
        allow_comment: 1,
        cate: [{name: 'News', pathname: 'news'}],
        tag: [{name: 'Node', pathname: 'node'}]
      };
    }
  };
  const archive = new Archive(createController({params: {pathname: 'detail'}, models: {post}}), {type: 'post'});
  await archive.execute();
  archive.next();

  assert.equal(archive.content(), '<p>Body</p>');
  assert.equal(archive.category(), '<a href="/cate/news">News</a>');
  assert.equal(archive.tags(' / ', false), 'Node');
  assert.equal(archive.allow('comment'), true);
});

test('attachment is an independent content type with its own permalink', async() => {
  const query = {
    setRelation(value) {
      assert.equal(value, 'user');
      return this;
    },
    where(value) {
      assert.deepEqual(value, {pathname: 'manual', is_public: 1, type: 2, status: 3});
      return this;
    },
    async find() {
      return {
        title: 'manual.pdf',
        pathname: 'manual',
        type: 2,
        options: JSON.stringify({attachment: {url: '/uploads/manual.pdf', mime: 'application/pdf'}})
      };
    }
  };
  const controller = createController({params: {pathname: 'manual'}, models: {post: query}});
  const archive = new Archive(controller, {type: 'attachment'});
  await archive.execute();
  archive.next();

  assert.equal(archive.permalink, '/attachment/manual.html');
  assert.equal(archive.options.attachment.url, '/uploads/manual.pdf');
});

test('preview query without preview payload does not bypass stored post protection', async() => {
  const post = {
    async getPostDetail() {
      return {
        id: 9,
        title: 'Protected',
        pathname: 'protected',
        content: '<p>Secret body</p>',
        allow_comment: 1,
        options: JSON.stringify({postPasswordHash: 'hash'})
      };
    }
  };
  const protection = {
    isUnlocked() { return false },
    form() { return '<form>password</form>' }
  };
  const archive = new Archive(createController({
    params: {pathname: 'protected', preview: 'true'},
    models: {post},
    services: {'post-protection': protection}
  }), {type: 'post'});
  await archive.execute();
  archive.next();

  assert.equal(archive.content(), '<form>password</form>');
  assert.equal(archive.title(), '此内容被密码保护');
  assert.equal(archive.allow('comment'), false);
  assert.equal(archive.row.options.postPasswordHash, undefined);
});

test('password protected pages hide content and theme fields until unlocked', async() => {
  const post = {setRelation() { return this }, where() { return this }, async find() {
    return {id: 23, pathname: 'secret', title: 'Private title', content: 'Secret content',
      markdown_content: 'Secret markdown', allow_comment: 1,
      options: JSON.stringify({postPasswordHash: 'hash', template: 'photos.eta', fields: {cover: '/secret.jpg'}})};
  }};
  const protection = {unlock: async(_post, password) => password === 'correct', form: () => '<form>password</form>'};
  const make = (method, body) => new Archive(createController({params: {pathname: 'secret'}, models: {post},
    services: {'post-protection': protection}, method, body}), {type: 'page'});
  const locked = make('GET', {}); await locked.execute(); locked.next();
  assert.equal(locked.title(), '此内容被密码保护');
  assert.equal(locked.content(), '<form>password</form>');
  assert.equal(locked.row.markdown_content, '');
  assert.deepEqual(locked.row.options, {});
  assert.deepEqual(locked.row.fields, {});
  assert.equal(locked.allow('comment'), false);
  const unlocked = make('POST', {protectPassword: 'correct'}); await unlocked.execute(); unlocked.next();
  assert.equal(unlocked.title(), 'Private title');
  assert.equal(unlocked.content(), 'Secret content');
  assert.equal(unlocked.row.options.template, 'photos.eta');
  assert.equal(unlocked.row.options.postPasswordHash, undefined);
});

test('correct password unlocks only the current POST request', async() => {
  const post = {
    async getPostDetail() {
      return {
        id: 10,
        pathname: 'protected',
        content: '<p>Secret body</p>',
        options: JSON.stringify({postPasswordHash: 'hash'})
      };
    }
  };
  const protection = {
    async unlock(article, password) { return article.id === 10 && password === 'secret' },
    form() { return '<form>password</form>' }
  };
  const unlocked = new Archive(createController({
    params: {pathname: 'protected'}, models: {post}, services: {'post-protection': protection},
    body: {protectPassword: 'secret'}, method: 'POST'
  }), {type: 'post'});
  await unlocked.execute();
  unlocked.next();
  assert.equal(unlocked.content(), '<p>Secret body</p>');

  const nextRequest = new Archive(createController({
    params: {pathname: 'protected'}, models: {post}, services: {'post-protection': protection}
  }), {type: 'post'});
  await nextRequest.execute();
  nextRequest.next();
  assert.equal(nextRequest.content(), '<form>password</form>');
});

test('archive and search modes retain grouped and paginated views', async() => {
  const post = {
    async getPostArchive() {
      return {'2026年10月': [{title: 'Archived', pathname: 'archived'}]};
    },
    async getPostSearch(keyword) {
      assert.equal(keyword, 'query');
      return {currentPage: 1, totalPages: 1, count: 1, data: [{title: 'Found', pathname: 'found'}]};
    }
  };
  const grouped = new Archive(createController({models: {post}}), {type: 'archive'});
  await grouped.execute();
  assert.equal(grouped.grouped['2026年10月'][0].pathname, 'archived');

  const searchController = createController({
    params: {keyword: ' query '},
    models: {post},
    query: {keyword: 'query'}
  });
  const search = new Archive(searchController, {
    type: 'search'
  });
  await search.execute();
  assert.equal(search.keyword, 'query');
  assert.equal(search.pagination.count, 1);
  assert.equal(search.pageUrl(2), '/posts?keyword=query&page=2');
});
