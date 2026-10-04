'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline/promises');
const {spawn} = require('child_process');
const packageInfo = require('../package.json');
const start = require('./start');
const {initialize} = require('./installer');

const STATE_FILE = path.join('data', '.firekylin-initializing.json');
const TYPES_REFERENCE = '/// <reference types="firekylin" />\n';

const help = `Firekylin ${packageInfo.version}

Usage:
  firekylin new <folder> [options]
  firekylin [-D|--development]

New project options:
  --db-type <sqlite|mysql|postgresql>
  --db-host <host>             --db-port <port>
  --db-name <name>             --db-user <user>
  --db-password <password>     --db-prefix <prefix>
  --db-path <path>
  --site-title <title>         --site-url <url>
  --admin-user <user>          --admin-password <password>
  --admin-email <email>        --package-manager <npm|pnpm|yarn>
  --non-interactive            --skip-install
  -h, --help                   -v, --version

警告：通过 --db-password 或 --admin-password 传入密码可能被 shell history 记录。`;

function parseArgs(argv) {
  const options = {};
  const aliases = {
    '--db-type': 'dbType',
    '--db-host': 'dbHost',
    '--db-port': 'dbPort',
    '--db-name': 'dbName',
    '--db-user': 'dbUser',
    '--db-password': 'dbPassword',
    '--db-prefix': 'dbPrefix',
    '--db-path': 'dbPath',
    '--site-title': 'siteTitle',
    '--site-url': 'siteUrl',
    '--admin-user': 'adminUser',
    '--admin-password': 'adminPassword',
    '--admin-email': 'adminEmail',
    '--package-manager': 'packageManager'
  };
  const flags = {
    '--non-interactive': 'nonInteractive',
    '--skip-install': 'skipInstall',
    '-D': 'development',
    '--development': 'development'
  };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (aliases[arg]) {
      if (!argv[i + 1] || argv[i + 1].startsWith('-')) throw new Error(`${arg} 缺少参数`);
      options[aliases[arg]] = argv[++i];
    } else if (flags[arg]) options[flags[arg]] = true;
    else if (arg === '-h' || arg === '--help') options.help = true;
    else if (arg === '-v' || arg === '--version') options.version = true;
    else if (arg.startsWith('-')) throw new Error(`未知参数：${arg}`);
    else positional.push(arg);
  }
  return {options, positional};
}

function detectPackageManager(env = process.env) {
  const agent = env.npm_config_user_agent || '';
  if (agent.startsWith('pnpm/')) return 'pnpm';
  if (agent.startsWith('yarn/')) return 'yarn';
  return 'npm';
}

async function askMissing(options) {
  if (options.nonInteractive) return options;
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  const ask = async(key, label, fallback) => {
    if (!options[key]) options[key] = (await rl.question(`${label}${fallback ? ` (${fallback})` : ''}: `)).trim() || fallback;
  };
  try {
    await ask('dbType', '数据库类型 [sqlite/mysql/postgresql]', 'sqlite');
    if (options.dbType === 'sqlite') await ask('dbPath', 'SQLite 文件', 'data/firekylin.sqlite');
    else {
      await ask('dbHost', '数据库地址', '127.0.0.1');
      await ask('dbPort', '数据库端口', options.dbType === 'mysql' ? '3306' : '5432');
      await ask('dbName', '数据库名称', 'firekylin');
      await ask('dbUser', '数据库账号');
      await ask('dbPassword', '数据库密码');
    }
    await ask('dbPrefix', '数据表前缀', 'fk_');
    await ask('siteTitle', '站点名称', 'Firekylin');
    await ask('siteUrl', '站点 URL', 'http://127.0.0.1:8360');
    await ask('adminUser', '管理员用户名', 'admin');
    await ask('adminPassword', '管理员密码');
    await ask('adminEmail', '管理员邮箱');
    await ask('packageManager', '包管理器 [npm/pnpm/yarn]', detectPackageManager());
  } finally {
    rl.close();
  }
  return options;
}

function validateNewOptions(options) {
  const required = ['dbType', 'siteTitle', 'siteUrl', 'adminUser', 'adminPassword', 'adminEmail'];
  if (options.dbType === 'sqlite') required.push('dbPath');
  else required.push('dbHost', 'dbPort', 'dbName', 'dbUser', 'dbPassword');
  const missing = required.filter(key => !options[key]);
  if (missing.length) throw new Error(`缺少必填参数：${missing.join(', ')}`);
  if (!['sqlite', 'mysql', 'postgresql'].includes(options.dbType)) throw new Error(`无效数据库类型：${options.dbType}`);
  if (!['npm', 'pnpm', 'yarn'].includes(options.packageManager)) throw new Error(`无效包管理器：${options.packageManager}`);
  if (!/^[A-Za-z0-9_]*$/.test(options.dbPrefix || '')) throw new Error('数据表前缀只能包含字母、数字和下划线');
}

function projectConfig(options) {
  const database = {type: options.dbType, prefix: options.dbPrefix || 'fk_'};
  if (options.dbType === 'sqlite') database.path = options.dbPath;
  else {
    Object.assign(database, {
      host: options.dbHost,
      port: Number(options.dbPort),
      database: options.dbName,
      user: options.dbUser,
      password: options.dbPassword
    });
  }
  return {server: {host: '0.0.0.0', port: 8360, proxy: true}, database};
}

function serializeConfig(config) {
  return `'use strict';\n\nmodule.exports = ${JSON.stringify(config, null, 2)};\n`;
}

function runInstall(manager, cwd) {
  const args = manager === 'yarn' ? ['install'] : ['install'];
  return new Promise((resolve, reject) => {
    const child = spawn(manager, args, {cwd, stdio: 'inherit'});
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${manager} install 退出码 ${code}`)));
  });
}

function mergeResumeOptions(rawOptions, config, state) {
  return Object.assign({
    dbType: config.database.type,
    dbPrefix: config.database.prefix,
    dbPath: config.database.path,
    dbHost: config.database.host,
    dbPort: config.database.port,
    dbName: config.database.database,
    dbUser: config.database.user,
    dbPassword: config.database.password,
    siteTitle: state.site.title,
    siteUrl: state.site.siteUrl,
    adminUser: state.site.username,
    adminPassword: state.site.password,
    adminEmail: state.site.email,
    packageManager: detectPackageManager()
  }, rawOptions);
}

function scaffold(target, options) {
  const statePath = path.join(target, STATE_FILE);
  const exists = fs.existsSync(target);
  const entries = exists ? fs.readdirSync(target) : [];
  const resuming = entries.length > 0 && fs.existsSync(statePath);
  if (entries.length > 0 && !resuming) throw new Error(`目标目录已存在且非空：${target}`);
  fs.mkdirSync(target, {recursive: true});
  fs.mkdirSync(path.join(target, 'themes'), {recursive: true});
  fs.mkdirSync(path.join(target, 'uploads'), {recursive: true});
  fs.mkdirSync(path.join(target, 'data', 'runtime'), {recursive: true});
  fs.mkdirSync(path.join(target, 'data', 'logs'), {recursive: true});
  if (!fs.existsSync(path.join(target, 'themes', 'firekylin'))) {
    fs.cpSync(
      path.join(__dirname, '..', 'www', 'theme', 'firekylin'),
      path.join(target, 'themes', 'firekylin'),
      {recursive: true}
    );
  }
  const config = projectConfig(options);
  fs.writeFileSync(path.join(target, 'firekylin.config.js'), serializeConfig(config), {mode: 0o600});
  fs.chmodSync(path.join(target, 'firekylin.config.js'), 0o600);
  const manifest = {
    name: path.basename(target).toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'firekylin-site',
    private: true,
    scripts: {start: 'firekylin', dev: 'firekylin -D'},
    dependencies: {firekylin: packageInfo.version}
  };
  fs.writeFileSync(path.join(target, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(target, 'firekylin.d.ts'), TYPES_REFERENCE);
  fs.writeFileSync(path.join(target, '.gitignore'), `node_modules/
data/logs
data/runtime
data/.firekylin-initializing.json
data/.installed
.vercel`);
  fs.writeFileSync(path.join(target, 'main.js', `module.exports = require('firekylin');`));
  fs.writeFileSync(path.join(target, 'vercel.json'), `{
  "name": "firekylin",
  "builds": [
    {
      "src": "main.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/main.js"
    }
  ],
  "github": {
    "silent": true
  }
}`);

  const state = {
    site: {
      title: options.siteTitle,
      siteUrl: options.siteUrl,
      username: options.adminUser,
      password: options.adminPassword,
      email: options.adminEmail
    }
  };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), {mode: 0o600});
  return {config, statePath, resuming};
}

async function createProject(folder, rawOptions) {
  if (!folder) throw new Error('请指定项目目录：firekylin new <folder>');
  const target = path.resolve(folder);
  let options = rawOptions;
  const existingState = path.join(target, STATE_FILE);
  if (fs.existsSync(existingState)) {
    const state = JSON.parse(fs.readFileSync(existingState, 'utf8'));
    const config = require(path.join(target, 'firekylin.config.js')); // eslint-disable-line import/no-dynamic-require
    options = mergeResumeOptions(rawOptions, config, state);
  } else {
    options.packageManager = options.packageManager || detectPackageManager();
    options = await askMissing(options);
  }
  validateNewOptions(options);
  const {config, statePath} = scaffold(target, options);
  if (!options.skipInstall) await runInstall(options.packageManager, target);
  await initialize(target, config, {
    title: options.siteTitle,
    siteUrl: options.siteUrl,
    username: options.adminUser,
    password: options.adminPassword,
    email: options.adminEmail
  });
  fs.writeFileSync(path.join(target, 'data', '.installed'), 'firekylin\n');
  fs.unlinkSync(statePath);
  console.log(`Firekylin 项目已创建：${target}`); // eslint-disable-line no-console
}

async function run(argv) {
  const {options, positional} = parseArgs(argv);
  if (options.help) return console.log(help); // eslint-disable-line no-console
  if (options.version) return console.log(packageInfo.version); // eslint-disable-line no-console
  if (positional[0] === 'new') return createProject(positional[1], options);
  if (positional.length) throw new Error(`未知命令：${positional[0]}`);
  return start({development: options.development});
}

module.exports = {
  createProject,
  detectPackageManager,
  mergeResumeOptions,
  parseArgs,
  projectConfig,
  run,
  scaffold,
  validateNewOptions
};
