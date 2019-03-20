'use strict';
const helpers = require('./helpers.js');

module.exports = {
    appSrc: helpers.root('/static/src'),
    entryHTML: helpers.root('/view/admin/index_index.html'),
    base: helpers.root('/static'),
    distSrc: helpers.root('/static/js/'),
    // TODO: iconsWorkaroundPath should be removed when ISSUE IS FIXED: https://github.com/ant-design/ant-design/issues/12011
    iconsWorkaroundPath: helpers.root('/static/src/icons.js'),
}
