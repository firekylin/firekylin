var stc = require('stc');
var cssCompress = require('stc-css-compress');
// var resourceVersion = require('stc-resource-version');
var localstorage = require('stc-localstorage');
var localstorageAdapter = require('stc-localstorage-nunjucks');
var cssCombine = require('stc-css-combine');
// var htmlCompress = require('stc-html-compress');

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
  cssCombine: {plugin: cssCombine, include: /\.css$/},
  cssCompress: {plugin: cssCompress},
  localstorage: {
    include: {type: 'tpl'},
    plugin: localstorage,
    options: {
      adapter: localstorageAdapter,
      minLength : 200,
      appId : '3e988cdb'
    }
  },
  // htmlCompress: {plugin: htmlCompress}
  // resourceVersion: {plugin: resourceVersion}
});

stc.start();
