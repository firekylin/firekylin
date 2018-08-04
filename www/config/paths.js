'use strict';

const path = require('path');
const fs = require('fs');
const url = require('url');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

module.exports = {
    appSrc: resolveApp('/www/static/src'),
    entryHTML: resolveApp('/view/admin/index_index.html'),
    base: resolveApp('/www/static'),
}
