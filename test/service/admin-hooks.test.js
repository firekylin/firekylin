const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const adminRoot = path.join(__dirname, '../../www/static/src');

function sourceFiles(directory) {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return entry.name.endsWith('.tsx') ? [target] : [];
  });
}

test('admin UI contains only function components and hooks', () => {
  const forbidden = [
    /extends\s+(?:React\.)?(?:Component|PureComponent)/,
    /@(observer|inject)\b/,
    /\bcomponent(?:DidMount|DidUpdate|WillUnmount|WillReceiveProps|WillMount)\b/
  ];

  const violations = sourceFiles(adminRoot).flatMap(file => {
    const source = fs.readFileSync(file, 'utf8');
    return forbidden.some(pattern => pattern.test(source))
      ? [path.relative(adminRoot, file)]
      : [];
  });

  assert.deepEqual(violations, []);
});

test('admin function components do not call class-only forceUpdate', () => {
  const offenders = sourceFiles(adminRoot).filter(file =>
    /(?:this|legacy)\.forceUpdate\s*\(/.test(fs.readFileSync(file, 'utf8'))
  );
  assert.deepEqual(offenders, [], 'replace forceUpdate with explicit hook state updates');
});
