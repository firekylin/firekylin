#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '../../..'));
if (!fs.existsSync(path.join(root, 'src/plugin/content-tools.js'))) {
  throw new Error('Pass the Firekylin source root: node export-tools.cjs /path/to/firekylin');
}
const ToolRegistry = require(path.join(root, 'src/plugin/tools'));
const {registerContentTools} = require(path.join(root, 'src/plugin/content-tools'));
const {registerManagementTools} = require(path.join(root, 'src/plugin/management-tools'));
const {registerMediaTools} = require(path.join(root, 'src/plugin/media-tools'));
const registry = new ToolRegistry();
const unavailable = () => { throw new Error('Metadata export must not execute application operations') };
registerContentTools(registry, {getModel: unavailable, now: unavailable});
registerManagementTools(registry, {getModel: unavailable, now: unavailable, getCommentService: unavailable});
registerMediaTools(registry, {getUploadConfig: unavailable, getUploader: unavailable});
const pack = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
process.stdout.write(JSON.stringify({
  package: pack.name,
  manifestVersion: pack.version,
  scope: 'Built-in registry metadata, not a deployed client tools/list response',
  tools: registry.list()
}, null, 2) + '\n');
