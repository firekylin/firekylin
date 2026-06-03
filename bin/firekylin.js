#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const packageRoot = path.join(__dirname, '..');
const packageJson = require(path.join(packageRoot, 'package.json'));

if (process.env.FK_RUN_SERVER === '1') {
  require(path.join(packageRoot, 'cli'))({});
  return;
}

const argv = process.argv.slice(2);
const command = argv[0];

const printHelp = () => {
  console.log(`Firekylin v${packageJson.version}

Usage:
  firekylin init [project-dir]
  firekylin server [--host <host>] [--port <port>]
`);
};

const fail = message => {
  console.error(message);
  process.exit(1);
};

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
      firekylin: `^${packageJson.version}`
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

const parseServerOptions = args => {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const item = args[i];
    if (item === '--host') {
      options.host = args[i + 1];
      i++;
      continue;
    }
    if (item === '--port') {
      options.port = args[i + 1];
      i++;
      continue;
    }
    fail(`Unknown option: ${item}`);
  }

  if (options.port && !/^\d+$/.test(options.port)) {
    fail(`Invalid port: ${options.port}`);
  }
  return options;
};

const startServer = options => require(path.join(packageRoot, 'cli'))(options);

if (!command || command === '-h' || command === '--help') {
  printHelp();
  process.exit(0);
}

if (command === 'init') {
  initProject(argv[1]);
  process.exit(0);
}

if (command === 'server') {
  const options = parseServerOptions(argv.slice(1));
  process.env.FK_RUN_SERVER = '1';
  startServer(options);
} else {
  fail(`Unknown command: ${command}`);
}
