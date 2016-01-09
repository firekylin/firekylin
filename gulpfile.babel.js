
import fs from 'fs';
import del from 'del';
import gulp from 'gulp';
import path from 'path';
import chalk from 'chalk';
import mysql from 'mysql';
import webpack from 'webpack';
import through from 'through2';
import minimist from 'minimist';
import inquirer from 'inquirer';
import merge from 'merge-stream';
import runSequence from 'run-sequence';
import browserSync from 'browser-sync';
import gulpLoadplugin from 'gulp-load-plugins';

import webpackConfig from './webpack.config';
import serverConfig from './src/common/config/config'

const argv = minimist(process.argv.slice(2));
const DEBUG = !argv.release;
const $ = gulpLoadplugin();

const serverDist = 'app';
const webDist = 'www/static/dist';

let WATCH = false;


// Build all files, the default task
gulp.task('default', ['clean'], cb => {
  $.util.log('DEBUG: ', DEBUG ? chalk.red('ON') : chalk.green('OFF'));
  runSequence('server', 'web', 'clean-tmp', cb);
});


// Watch files for changes
gulp.task('watch', cb => {
  WATCH = true;

  //gulp.watch(['www/static/src/**/*.{js,jsx}'], ['web scripts']);
  gulp.watch(['www/static/css/**/*.{css,scss}'], ['web styles']);

  gulp.watch(['src/**/*.js'], ['server script']);
  gulp.watch(['src/**/*.json'], ['server json']);

  runSequence('default', cb);
});


// Build-in server for developer
gulp.task('serve', ['watch'], () => {
  browserSync({
    proxy: `127.0.0.1:${serverConfig.port}`,
    reloadDebounce: 500,
    open: false
  });

  let reload = browserSync.reload;

  gulp.watch(`${webDist}/*.{css,js}`, reload);
  gulp.watch(`www/static/images/**`, reload);
  gulp.watch(`www/static/fonts/**`, reload);
});



// Clean output directory and temporary directory
gulp.task('clean', cb => del(['.tmp', serverDist, webDist], {dot: true}, cb));
gulp.task('clean-tmp', cb => del(['.tmp'], {dot: true}, cb));


// Compile server
gulp.task('server', ['server script', 'server json']);

// Compile server script
gulp.task('server script', () => {
  let src = gulp.src(['src/**/*.js'], {base: 'src'});

  return DEBUG ? src
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.babel({stage: 0, optional: ['runtime']}))
    .pipe($.sourcemaps.write('.', {includeContent: false, sourceRoot: 'src'}))
    .pipe(gulp.dest(serverDist))
    .pipe($.size({title: 'server'}))
    : src
    .pipe($.babel({stage: 0, optional: ['runtime']}))
    .pipe(gulp.dest(serverDist))
    .pipe($.size({title: 'server script'}));
});

// copy server json
gulp.task('server json', () => {
  return gulp.src(['src/server/**/*.json'], {base: 'src'})
    .pipe(gulp.dest('app'))
    .pipe($.size({title: 'server json'}));
});



// Compile web
gulp.task('web', ['web scripts', 'web styles']);

// Compile web scripts by webpack
gulp.task('web scripts', callback => {
  const bundler = webpack(webpackConfig);
  let flag = true;

  let bundle = function (err, stats) {
    if (err) {
      throw new $.util.PluginError('webpack', err);
    }
    $.util.log('[webpack]', stats.toString({
      hash: false,
      version: false,
      chunkModules: false
    }));
    flag && callback();
    flag = false;
  };

  if (WATCH) {
    bundler.watch(200, bundle);
  } else {
    bundler.run(bundle);
  }
});

// Compile and automatically prefix stylesheets
gulp.task('web styles', () => {
  const AUTOPREFIXER_BROWSERS = [
    'chrome >= 40',
    'ie >= 10',
    'ff >= 30',
    'safari >= 7',
    'opera >= 23'
  ];

  function compile(src, dist) {
    return DEBUG ? src
      .pipe($.changed('.tmp/styles', {extension: '.css'}))
      .pipe($.sourcemaps.init())
      .pipe($.sass({ sourceComments: true, includePaths: ['www/static/css/common', 'node_modules'] }).on('error', $.sass.logError))
      .pipe($.autoprefixer({browsers: AUTOPREFIXER_BROWSERS.slice(0, 1)}))
      .pipe($.concat(dist))
      .pipe(gulp.dest('.tmp'))
      .pipe($.sourcemaps.write('.', {includeContent: true, sourceRoot: '/static/css/admin'}))
      .pipe(gulp.dest(webDist))
      .pipe($.size({title: 'web styles'}))
      : src
      .pipe($.sass({ outputStyle: 'compressed', includePaths: ['www/static/css/common', 'node_modules'] }).on('error', $.sass.logError))
      .pipe($.autoprefixer({browsers: AUTOPREFIXER_BROWSERS}))
      .pipe($.concat(dist))
      .pipe(gulp.dest(webDist))
      .pipe($.size({title: 'web styles'}));
  }

  return merge(
    compile(gulp.src(['www/static/css/admin/**/*.{css,scss}']), 'admin.css'),
    compile(gulp.src(['www/static/css/web/**/*.{css,scss}']), 'web.css')
  );
});

//Release
gulp.task('release', ['server', 'web'], function() {
  let distPath = path.join(__dirname, '/release');

  gulp.src([
    "{src,view,www}/**",
    "!www/static/css/**",
    "!www/static/src/**",
    "firekylin.sql",
    "install.js",
    "README.md"
  ]).pipe(gulp.dest(distPath));

  gulp.src( 'package.json' )
  .pipe(through.obj(function(file, encoding, callback) {
    let pack = JSON.parse( file.contents.toString() );
    ["serve", "release"].forEach( cmd => (delete pack.scripts[cmd]) );
    for(let module in pack.dependencies) {
      if(/^(babel-core|babel-loader|browser-sync|del|eslint.*|eventemitter3|gulp.*|mocha|run-sequence|through2|webpack)$/.test(module))
      {
        delete pack.dependencies[module];
      }
    }
    pack.scripts.install = "node install.js";
    pack.scripts.compile = "babel --loose all --optional runtime --stage 0 --modules common src/ --out-dir app/ --retain-lines";
    pack.scripts.start = "npm run compile && node www/index.js";

    file.contents = new Buffer(JSON.stringify(pack, null, '\t'));
    callback(null, file);
  })).pipe(gulp.dest( distPath ));
});
