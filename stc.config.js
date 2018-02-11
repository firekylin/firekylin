var stc = require('stc');
var htmlCompress = require('stc-html-compress');
var uglify = require('stc-uglify');
var cssCompress = require('stc-css-compress');
var resourceVersion = require('stc-resource-version');


stc.config({
  product: 'firekylin',
  include: ['view/', 'www/static/'],
  exclude: [/static\/src/, /static\/upload/],
  tpl: {
    engine: 'nunjucks',
    ld: ['{%', '{{', '{#'],
    rd: ['%}', '}}', '#}']
  }
});

stc.workflow({
  uglify: {plugin: uglify, exclude: [/static\/src/]},
  cssCompress: {plugin: cssCompress},
  resourceVersion: {plugin: resourceVersion},
  htmlCompress: {plugin: htmlCompress}
});

stc.start();
