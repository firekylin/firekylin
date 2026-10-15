'use strict';

const fs = require('fs');
const path = require('path');

const STATIC_PREFIX = '/static/dist/';
const FALLBACK = Object.freeze({
  script: `${STATIC_PREFIX}assets/admin.js`,
  styles: [`${STATIC_PREFIX}assets/admin.css`]
});

function assetUrl(file) {
  if (typeof file !== 'string' || !file.startsWith('assets/') || file.includes('..')) return null;
  return STATIC_PREFIX + file;
}

function getAdminAssets(rootPath) {
  try {
    const manifestPath = path.join(rootPath, 'www/static/dist/.vite/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const entry = Object.values(manifest).find(item => item && item.isEntry && item.src === 'index.html');
    const script = entry && assetUrl(entry.file);
    if (!script) return FALLBACK;
    const styleEntry = manifest['style.css'];
    const styles = [...new Set([...(entry.css || []), styleEntry && styleEntry.file]
      .map(assetUrl)
      .filter(Boolean))];
    return {script, styles};
  } catch {
    return FALLBACK;
  }
}

module.exports = {FALLBACK, getAdminAssets};
