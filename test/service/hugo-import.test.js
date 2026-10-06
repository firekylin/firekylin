const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const JSZip = require('jszip');
const {normalizeEntry, parseFrontMatter} = require('../../src/service/import/hugo/parser');

test('parses Hugo YAML front matter', () => {
  const item = normalizeEntry('site/content/post/hello.md', `---
title: Hello
slug: hello-world
date: 2024-01-02T03:04:05Z
draft: true
categories: [Tech]
tags: [Node.js, Hugo]
comments: false
---
Content`);

  assert.equal(item.title, 'Hello');
  assert.equal(item.pathname, 'hello-world');
  assert.equal(item.markdown_content, 'Content');
  assert.equal(item.draft, true);
  assert.equal(item.allow_comment, 0);
  assert.deepEqual(item.categories, ['Tech']);
  assert.deepEqual(item.tags, ['Node.js', 'Hugo']);
});

test('parses Hugo TOML and JSON front matter', () => {
  const toml = parseFrontMatter(`+++
title = "About"
tags = ["one", "two"]
draft = false
+++
About body`);
  assert.equal(toml.attributes.title, 'About');
  assert.deepEqual(toml.attributes.tags, ['one', 'two']);
  assert.equal(toml.body, 'About body');

  const json = parseFrontMatter('{"title":"JSON post","tags":["json"]}\nBody');
  assert.equal(json.attributes.title, 'JSON post');
  assert.equal(json.body, 'Body');
});

test('uses bundle directory as the slug for index files', () => {
  const item = normalizeEntry('content/post/my-bundle/index.md', '# Bundle');
  assert.equal(item.title, 'my-bundle');
  assert.equal(item.pathname, 'my-bundle');
  assert.equal(item.page, false);
});

test('classifies posts directory entries as posts and root entries as pages', () => {
  const post = normalizeEntry('site/content/posts/hello.md', '# Post');
  const page = normalizeEntry('site/content/about.md', '# About');

  assert.equal(post.page, false);
  assert.equal(page.page, true);
});

test('reads a zipped Hugo content directory and ignores section indexes', async() => {
  global.think = {Service: class {}};
  const HugoImport = require('../../src/service/import/hugo');
  const zip = new JSZip();
  zip.file('posts/hello.md', '---\ntitle: Hello\n---\nHello');
  zip.file('about.md', '---\ntitle: About\n---\nAbout');
  zip.file('posts/_index.md', '---\ntitle: Posts\n---');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-hugo-'));
  const filename = path.join(directory, 'content.zip');
  fs.writeFileSync(filename, await zip.generateAsync({type: 'nodebuffer'}));

  try {
    const items = await HugoImport.prototype.parseZip({path: filename});
    assert.equal(items.length, 2);
    assert.equal(items.find(item => item.title === 'Hello').page, false);
    assert.equal(items.find(item => item.title === 'About').page, true);
  } finally {
    fs.rmSync(directory, {recursive: true});
  }
});
