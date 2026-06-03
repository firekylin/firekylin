#!/usr/bin/env node
// const os = require('node:os');
const fs = require('fs');
const path = require('path');
// const Application = require('thinkjs');
const { program } = require('commander');

const pkgRoot = path.join(__dirname, '..');
const pkg = require(path.join(pkgRoot, 'package.json'));
const FirekylinServer = require(path.join(pkgRoot, 'vercel.js'));

program
  .name('firekylin')
  .version(pkg.version)
  .description('A simple and efficient blogging platform')
  .usage('<command> [options]');


program
  .command('init [project-dir]')
  .description('Initialize a new Firekylin project')
  .action(projectDir => {
    const targetDir = path.resolve(process.cwd(), projectDir || '.');
    if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
      console.error(`Directory is not empty: ${targetDir}`);
      process.exit(1);
    }
    initProject(projectDir);
  });

program
  .command('server')
  .description('Start the Firekylin server')
  .option('--host <host>', 'Host to listen on', '127.0.0.1')
  .option('--port <port>', 'Port to listen on', '3000')
  .action(options => {
    require('http').createServer(FirekylinServer).listen(options.port, options.host, () => {
      console.log(`Firekylin server running at http://${options.host}:${options.port}`);
    });
  });


program.parse();

const ensureDir = dir => {
  fs.mkdirSync(dir, {recursive: true});
};

const writeFile = (filepath, content) => {
  if (fs.existsSync(filepath)) {
    fail(`File already exists: ${filepath}`);
  }
  fs.writeFileSync(filepath, content, 'utf8');
};

const initProject = projectDir => {
  const targetDir = path.resolve(process.cwd(), projectDir || '.');
  ensureDir(targetDir);

  writeFile(path.join(targetDir, 'package.json'), JSON.stringify({
    name: path.basename(targetDir),
    private: true,
    scripts: {
      server: 'firekylin server'
    },
    dependencies: {
      firekylin: `^${pkg.version}`
    }
  }, null, 2) + '\n');

  writeFile(path.join(targetDir, 'firekylin.config.js'), `'use strict';

module.exports = {
  type: 'sqlite',
  adapter: {
    sqlite: {
      path: './runtime',
      database: 'firekylin',
      prefix: 'fk_'
    },
    mysql: {
      host: '127.0.0.1',
      port: '3306',
      database: 'firekylin',
      user: 'root',
      password: '',
      prefix: 'fk_',
      encoding: 'utf8mb4'
    },
    postgresql: {
      host: '127.0.0.1',
      port: '5432',
      database: 'firekylin',
      user: 'postgres',
      password: '',
      prefix: 'fk_'
    }
  }
};
`);

  ensureDir(path.join(targetDir, 'theme'));
  ensureDir(path.join(targetDir, 'static'));

  console.log(`Firekylin project initialized at ${targetDir}`);
};
