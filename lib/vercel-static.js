'use strict';

const fs = require('fs');
const path = require('path');

function build(projectPath, packagePath = path.resolve(__dirname, '..')) {
  const outputPath = path.join(projectPath, '.vercel-static');
  fs.rmSync(outputPath, {recursive: true, force: true});
  fs.mkdirSync(outputPath, {recursive: true});

  fs.cpSync(
    path.join(packagePath, 'www', 'static'),
    path.join(outputPath, 'static'),
    {recursive: true}
  );

  return outputPath;
}

module.exports = {build};
