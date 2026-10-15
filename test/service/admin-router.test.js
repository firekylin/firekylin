const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const adminSource = path.resolve(__dirname, '../../www/static/src');
const routerModule = path.join(adminSource, 'utils/router.tsx');

function sourceFiles(directory) {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.tsx?$/.test(entry.name) ? [file] : [];
  });
}

test('admin components share one React Router entry point', () => {
  const directRouterImports = sourceFiles(adminSource).filter(file => {
    if (file === routerModule) return false;
    return /from ['"]react-router-dom['"]/.test(fs.readFileSync(file, 'utf8'));
  });

  assert.deepEqual(directRouterImports, [],
    'import React Router through utils/router so every Link shares the BrowserRouter context');
});

test('Vite deduplicates React and Router context packages', () => {
  const config = fs.readFileSync(path.resolve(__dirname, '../../vite.config.ts'), 'utf8');
  for (const dependency of ['react', 'react-dom', 'react-router', 'react-router-dom']) {
    assert.match(config, new RegExp(`dedupe: \\[[^\\]]*['"]${dependency}['"]`));
  }
});

test('production entry uses a hashed filename instead of a query-string module version', () => {
  const config = fs.readFileSync(path.resolve(__dirname, '../../vite.config.ts'), 'utf8');
  const template = fs.readFileSync(path.resolve(__dirname, '../../view/admin.eta'), 'utf8');
  assert.match(config, /entryFileNames:\s*['"]assets\/\[name\]-\[hash\]\.js['"]/);
  assert.match(config, /manifest:\s*true/);
  assert.doesNotMatch(template, /admin\.js\?v=/);
  assert.match(template, /adminAssets\.script/);
});
