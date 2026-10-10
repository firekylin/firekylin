var fs = require('fs');
var yaml = require('js-yaml');

var content = fs.readFileSync('./package.json', 'utf8');
var data = JSON.parse(content);
delete data.devDependencies;
delete data.thinkjs;
data.scripts = {
  start: 'node production.js',
  'cron:rss': 'npm start -- "admin/cron/rss"',
  'cron:comment': 'npm start -- "crontab/sync_comment"'
};
fs.writeFileSync('output/package.json', JSON.stringify(data, undefined, 4));
fs.writeFileSync('.version', data.version);

// copy pnpm-workspace.yaml with only sqlite3 in allowBuilds
var workspace = yaml.load(fs.readFileSync('./pnpm-workspace.yaml', 'utf8'));
workspace.allowBuilds = { sqlite3: true };
fs.writeFileSync('output/pnpm-workspace.yaml', yaml.dump(workspace));

//replace download url in README.md
//
var readme = fs.readFileSync('./README.md', 'utf8');
var readme = readme.replace(/firekylin_\d\.\d\.\d/, 'firekylin_' + data.version);
readme = readme.replace(/v\d\.\d\.\d/, 'v' + data.version);
fs.writeFileSync('./README.md', readme);
