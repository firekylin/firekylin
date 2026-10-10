const assert = require('node:assert/strict');
const test = require('node:test');
const RecentPosts = require('../../src/widget/contents/post/recent');
const TagCloud = require('../../src/widget/metas/tag/cloud');
const CategoryList = require('../../src/widget/metas/category/list');
const Options = require('../../src/widget/options');

function controller(models) {
  return {
    ctx: {},
    model(name) { return models[name] }
  };
}

test('recent posts uses configured and explicit page sizes', async() => {
  const calls = [];
  const post = {
    async getPostsListSize() { return 7 },
    async getPostList(page, options) {
      calls.push([page, options]);
      return {data: [{title: 'Recent post', pathname: 'recent', summary: '<p>Summary text</p>', comment_num: 2}]};
    }
  };
  const defaultWidget = new RecentPosts(controller({post}), {});
  await defaultWidget.execute();
  const explicitWidget = new RecentPosts(controller({post}), {pageSize: 3});
  await explicitWidget.execute();

  assert.deepEqual(calls, [[1, {pageSize: 7}], [1, {pageSize: 3}]]);
  defaultWidget.next();
  assert.equal(defaultWidget.title(), 'Recent post');
  assert.equal(defaultWidget.title.val(), 'Recent post');
  assert.equal(defaultWidget.title(6), 'Recent...');
  assert.equal(defaultWidget.excerpt(), 'Summary text');
  assert.equal(defaultWidget.commentsNum('none', 'one', '%d comments'), '2 comments');
  assert.equal(defaultWidget.permalink, '/post/recent.html');
});

test('tag cloud filters, sorts and limits rows', async() => {
  const tag = {
    async getTagArchive() {
      return [
        {id: 1, name: 'Beta', pathname: 'beta', count: 0},
        {id: 2, name: 'Alpha', pathname: 'alpha', count: 2},
        {id: 3, name: 'Gamma', pathname: 'gamma', count: 1}
      ];
    }
  };
  const widget = new TagCloud(controller({tag}), {
    sort: 'name',
    desc: false,
    ignoreZeroCount: true,
    limit: 1
  });
  await widget.execute();
  widget.next();
  assert.equal(widget.title(), 'Alpha');
  assert.equal(widget.title.val(), 'Alpha');
  assert.equal(widget.permalink, '/tag/alpha');
  assert.equal(widget.theId, 'tag-2');
  assert.equal(widget.split(1, 3, 5), 3);
});

test('category list delegates to the lightweight category query', async() => {
  let calls = 0;
  const cate = {
    async getCateList() {
      calls += 1;
      return [{id: 4, name: 'Category', pathname: 'category', count: 1, children: []}];
    }
  };
  const widget = new CategoryList(controller({cate}), {});
  await widget.execute();
  assert.equal(calls, 1);
  widget.next();
  assert.equal(widget.title(), 'Category');
  assert.equal(widget.title.val(), 'Category');
  assert.equal(widget.permalink, '/cate/category');
});

test('options widget parses theme data and removes comment credentials', async() => {
  const options = {
    async getOptions() {
      return {
        comment: {name: '{"githubPassWord":"secret","repo":"comments"}'},
        navigation: '[{"label":"Home","url":"/"}]',
        theme: 'firekylin',
        themeConfig: '{"customCSS":"body{}"}',
        title: 'Blog'
      };
    }
  };
  const widget = new Options({
    ctx: {host: 'example.com'},
    model(name) { return {options}[name] }
  });
  await widget.execute();

  assert.equal(widget.title(), 'Blog');
  assert.equal(widget.title.val(), 'Blog');
  assert.equal(widget.siteUrl, 'http://example.com');
  assert.deepEqual(widget.navigation, [{label: 'Home', url: '/'}]);
  assert.equal(widget.themeConfig.customCSS, 'body{}');
  assert.deepEqual(JSON.parse(widget.row.comment.name), {repo: 'comments'});
  assert.equal(widget.themeUrl('/res/app.css'), '/theme/firekylin/res/app.css');
});
