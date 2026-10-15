'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {FALLBACK, getAdminAssets} = require('../../src/service/admin-assets');

function writeManifest(manifest) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-admin-assets-'));
  const directory = path.join(root, 'www/static/dist/.vite');
  fs.mkdirSync(directory, {recursive: true});
  fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest));
  return root;
}

test('loads immutable admin entry and stylesheet names from the Vite manifest', () => {
  const root = writeManifest({
    'index.html': {
      file: 'assets/admin-AbCd1234.js',
      css: ['assets/admin-EfGh5678.css'],
      isEntry: true,
      src: 'index.html'
    }
  });

  assert.deepEqual(getAdminAssets(root), {
    script: '/static/dist/assets/admin-AbCd1234.js',
    styles: ['/static/dist/assets/admin-EfGh5678.css']
  });
});

test('loads the single CSS bundle emitted separately by Vite', () => {
  const root = writeManifest({
    'index.html': {file: 'assets/admin-AbCd1234.js', isEntry: true, src: 'index.html'},
    'style.css': {file: 'assets/style-EfGh5678.css', src: 'style.css'}
  });
  assert.deepEqual(getAdminAssets(root).styles, ['/static/dist/assets/style-EfGh5678.css']);
});

test('falls back to stable asset paths when the manifest is missing or unsafe', () => {
  assert.deepEqual(getAdminAssets('/missing'), FALLBACK);
  const root = writeManifest({
    'index.html': {file: '../admin.js', isEntry: true, src: 'index.html'}
  });
  assert.deepEqual(getAdminAssets(root), FALLBACK);
});
