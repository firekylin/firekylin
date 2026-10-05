'use strict';

const fs = require('fs');
const path = require('path');

const STATIC_EXTENSIONS = new Set([
  '.css', '.eot', '.gif', '.ico', '.jpeg', '.jpg', '.js', '.png',
  '.svg', '.ttf', '.webp', '.woff', '.woff2'
]);

function copyDirectory(source, target, filter) {
  if (!fs.existsSync(source)) return;
  fs.cpSync(source, target, {
    recursive: true,
    filter: entry => fs.statSync(entry).isDirectory() || filter(entry)
  });
}

function build(projectPath, packagePath = path.resolve(__dirname, '..')) {
  const outputPath = path.join(projectPath, '.vercel-static');
  fs.rmSync(outputPath, {recursive: true, force: true});
  fs.mkdirSync(outputPath, {recursive: true});

  copyDirectory(
    path.join(packagePath, 'www', 'static'),
    path.join(outputPath, 'static'),
    () => true
  );
  copyDirectory(
    path.join(projectPath, 'themes'),
    path.join(outputPath, 'themes'),
    entry => STATIC_EXTENSIONS.has(path.extname(entry).toLowerCase())
  );
  copyDirectory(
    path.join(projectPath, 'uploads'),
    path.join(outputPath, 'uploads'),
    () => true
  );

  return outputPath;
}

module.exports = {STATIC_EXTENSIONS, build};
