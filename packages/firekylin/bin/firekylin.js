#!/usr/bin/env node
'use strict';

const {run} = require('../lib/cli');

run(process.argv.slice(2)).catch(err => {
  console.error(`Error: ${err.message}`); // eslint-disable-line no-console
  process.exitCode = 1;
});
