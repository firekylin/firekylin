const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {promisify} = require('node:util');

class Controller {
  constructor() {
    this.data = {};
    this.ctx = {url: '/attachment/manual.html'};
  }

  assign(name, value) {
    if (typeof name === 'undefined') return this.data;
    if (typeof value === 'undefined') return this.data[name];
    this.data[name] = value;
  }
}

global.think = {Controller, ROOT_PATH: path.join(__dirname, '../..'), promisify};
global.firekylin = {};

const PostController = require('../../src/controller/post');

function createController(templates) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-attachment-theme-'));
  templates.forEach(name => fs.writeFileSync(path.join(directory, `${name}.eta`), ''));
  const archive = {
    stack: [{title: 'manual.pdf', options: {attachment: {url: '/uploads/manual.pdf'}}}],
    have() { return true }
  };
  const controller = new PostController();
  const widget = async() => 'other-widget';
  widget.destroy = () => {};
  controller.assign('widget', widget);
  controller.THEME_VIEW_PATH = directory;
  controller.getWidget = async() => archive;
  controller.displayView = async name => name;
  return {archive, controller, directory};
}

test('attachment template takes priority and reuses the current archive widget', async t => {
  const {archive, controller, directory} = createController(['attachment', 'page', 'post']);
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));

  assert.equal(await controller.attachmentAction(), 'attachment');
  assert.equal(await controller.assign('widget')('Widget_Archive', {type: 'attachment'}), archive);
});

test('attachment falls back to page and post templates in Typecho order', async t => {
  const pageTheme = createController(['page', 'post']);
  const postTheme = createController(['post']);
  t.after(() => {
    fs.rmSync(pageTheme.directory, {recursive: true, force: true});
    fs.rmSync(postTheme.directory, {recursive: true, force: true});
  });

  assert.equal(await pageTheme.controller.attachmentAction(), 'page');
  assert.equal(await pageTheme.controller.assign('widget')('Widget_Archive', {type: 'page'}), pageTheme.archive);
  assert.equal(await postTheme.controller.attachmentAction(), 'post');
  assert.equal(await postTheme.controller.assign('widget')('Widget_Archive', {type: 'post'}), postTheme.archive);
});
