var stc = require('stc');
var htmlCompress = require('stc-html-compress');
var uglify = require('stc-uglify');
var cssCompress = require('stc-css-compress');
var resourceVersion = require('stc-resource-version');
var localstorage = require('stc-localstorage');
var localstorageAdapter = require('stc-localstorage-nunjucks');
var cssCombine = require('stc-css-combine');

stc.config({
  product: 'firekylin.view',
  include: ['www/theme/firekylin.build/html', 'www/theme/firekylin/res'],
  exclude: [],
  outputPath: 'output.theme',
  tpl: {
    engine: 'nunjucks',
    ld: ['{%', '{{', '{#'],
    rd: ['%}', '}}', '#}'],
  }
});

stc.workflow({
  uglify: {plugin: uglify},
  cssCombine: {plugin: cssCombine, include: /\.css$/},
  cssCompress: {plugin: cssCompress},
  htmlCompress: {plugin: htmlCompress},
  localstorage: {
    include: {type: 'tpl'},
    plugin: localstorage,
    options: {
      adapter: localstorageAdapter,
      minLength : 200,
      appId : '3e988cdb'
    }
  },
  resourceVersion: {plugin: resourceVersion}
});

stc.start();