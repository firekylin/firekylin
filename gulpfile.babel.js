
import fs from 'fs';
import del from 'del';
import gulp from 'gulp';
import chalk from 'chalk';
import mysql from 'mysql';
import webpack from 'webpack';
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

// Install
gulp.task('install', cb => {
  const configPath = './src/common/config/db.js';
  let config = {};
  let validator = function(type) {
    return function(string) {
      if (string.length == 0) {
        return 'Field cannot be empty';
      }
      if (type == 'hostname' && !string.match(/(?:\w+\.)+\w/)) {
        return 'Host should be a validator domain or ip';
      }
      if (type == 'port' && (!Number.isInteger(string) || string >65535)) {
        return 'Port should be a number and small than 65536';
      }
      return true;
    }
  };

  try {
    config = require(configPath);
  } catch (e) {}

  console.log('\n\nHello, welcome to FireKylin, a free and open-source content \nmanagement system (CMS), based on ThinkJS and Mysql.\n\nYou need do some config work before the program could work.\nThis utility will walk you through.\n');

  inquirer.prompt([
    { type: 'input', name: 'url', message: 'Full url of your blog', default: 'http://localhost:1234', validate: validator() },
    { type: 'input', name: 'db_hostname', message: 'Database hostname', default: config.host,  validate: validator('hostname') },
    { type: 'input', name: 'db_port', message: 'Database port', default: parseInt(config.port) || 3306, validate: validator('port') },
    //{ type: 'input', name: 'db_database', message: 'Database name', default: config.name, validate: validator() },
    { type: 'input', name: 'db_username', message: 'Database username', default: config.user, validate: validator() },
    { type: 'password', name: 'db_password', message: 'Database password', validate: validator() },
    //{ type: 'prefix', name: 'db_prefix', message: 'Database table prefix', default: config.prefix, validate: validator() }
  ], answers => {

    let now = new Date();

    //修正数据库名称和前缀
    answers.db_database = answers.db_database || 'firekylin';
    answers.db_prefix = answers.db_prefix || 'fk_';

    let content = `/**
 * db config
 * generate by installer
 * ${now}
 */
export default {
  type: 'mysql',
  host: '${answers.db_hostname}',
  port: '${answers.db_port}',
  name: '${answers.db_database}',
  user: '${answers.db_username}',
  pwd: '${answers.db_password}',
  prefix: '${answers.db_prefix}'
}`;

    fs.writeFileSync(configPath, content);

    /** auto import sql **/
    let sql = fs.readFileSync( './firekylin.sql', 'utf-8' ).replace(/\$\{db\_prefix\}/g, answers.db_prefix);
    let pool = mysql.createPool({
        host     : answers.db_hostname,
        user     : answers.db_username,
        password : answers.db_password
    });
    pool.getConnection(function(err, connection) {
      if(err) {
        console.log(err);
        return;
      }

      connection.query('CREATE DATABASE '+answers.db_database, function(err) {
        if(err) {
          if(err.errno == 1007) {
            console.log('\n'+answers.db_database+' database is already existed! Please change your database name.\n');
          }else {
            console.log(err);
          }
          connection.destroy();
          return;
        }
        connection.destroy();

        let db = mysql.createConnection({
          host: answers.db_hostname,
          port: answers.db_port,
          user: answers.db_username,
          password: answers.db_password,
          database: answers.db_database,
          multipleStatements: true
        });
        db.connect();
        db.query(sql, function(err) {
          if(err) console.log(err);
        });
        db.end();
        console.log('\n Data import successfully! input commond [npm start] start your blog!\n');
        runSequence('server script', cb);
      });
    });
  });
});
