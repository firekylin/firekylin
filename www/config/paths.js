'use strict';

const path = require('path');
const fs = require('fs');
const url = require('url');
const helpers = require('./helpers.js');

module.exports = {
    appSrc: helpers.root('/static/src'),
    entryHTML: helpers.root('/view/admin/index_index.html'),
    base: helpers.root('/static'),
    distSrc: helpers.root('/static/js/'),
}
