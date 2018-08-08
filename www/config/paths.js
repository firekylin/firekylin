'use strict';
const helpers = require('./helpers.js');

module.exports = {
    appSrc: helpers.root('/static/src'),
    entryHTML: helpers.root('/view/admin/index_index.html'),
    base: helpers.root('/static'),
    distSrc: helpers.root('/static/js/'),
}
