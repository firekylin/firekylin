import gulp from 'gulp';
import del from 'del';
import chalk from 'chalk';
import webpack from 'webpack';
import minimist from 'minimist';
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
    .pipe($.babel())
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
      .pipe($.sass({ sourceComments: true }).on('error', $.sass.logError))
      .pipe($.autoprefixer({browsers: AUTOPREFIXER_BROWSERS.slice(0, 1)}))
      .pipe($.concat(dist))
      .pipe(gulp.dest('.tmp'))
      .pipe($.sourcemaps.write('.', {includeContent: true, sourceRoot: '/static/css/admin'}))
      .pipe(gulp.dest(webDist))
      .pipe($.size({title: 'web styles'}))
      : src
      .pipe($.sass({ outputStyle: 'compressed' }).on('error', $.sass.logError))
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