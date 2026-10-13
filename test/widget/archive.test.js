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

function createController({params = {}, models = {}, query = {}} = {}) {
  return {
    ctx: {path: '/posts', query},
    get(name) { return params[name] },
    model(name) { return models[name] },
    post() { return undefined }
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
  const archive = new Archive(createController({params: {pathname: 'manual'}, models: {post: query}}), {type: 'attachment'});
  await archive.execute();
  archive.next();

  assert.equal(archive.permalink, '/attachment/manual.html');
  assert.equal(archive.options.attachment.url, '/uploads/manual.pdf');
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
