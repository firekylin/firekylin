'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const BaseController = require('../controller/base');
const {getContext} = require('../../lib/project-context');

function inside(root, file) {
  const relative = path.relative(root, file);
  return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}

function segment(value, label) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/i.test(value)) {
    throw new TypeError(`Invalid plugin theme ${label}`);
  }
}

module.exports = async function renderTheme(ctx, pluginId, name, data = {}) {
  // IDs come from registration; template names must be fixed plugin-owned names.
  // Neither request paths nor query parameters are used for template selection.
  if (typeof pluginId !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/i.test(pluginId) ||
      pluginId === '.' || pluginId === '..') {
    throw new TypeError('Invalid plugin theme plugin ID');
  }
  segment(name, 'template name');
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(data))) {
    throw new TypeError('Plugin theme data must be a plain object');
  }

  const controller = new BaseController(ctx);
  controller.initViewContext();
  const options = (await controller.getWidget('Widget_Options')).row;
  const themesRoot = path.resolve(getContext().themesPath);
  const themeRoot = path.resolve(themesRoot, options.theme || 'firekylin');
  if (themeRoot === themesRoot || !inside(themesRoot, themeRoot)) {
    throw new Error('Plugin theme path escapes the themes root');
  }
  let realThemesRoot, realThemeRoot;
  try {
    realThemesRoot = await fs.realpath(themesRoot);
    realThemeRoot = await fs.realpath(themeRoot);
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
  if (realThemeRoot === realThemesRoot || !inside(realThemesRoot, realThemeRoot)) {
    throw new Error('Plugin theme path escapes the themes root');
  }
  const templateName = `plugins/${pluginId}/${name}`;
  const file = path.join(themeRoot, templateName + '.eta');
  // Only absence of this exact override is optional. Never suppress rendering,
  // permissions, malformed manifests or missing includes/layouts after this point.
  let realFile;
  try {
    realFile = await fs.realpath(file);
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
  if (!inside(realThemeRoot, realFile)) {
    throw new Error('Plugin theme template escapes the active theme');
  }
  if (!(await fs.stat(realFile)).isFile()) throw new Error('Plugin theme template must be a file');

  controller.prepareThemeView(options);
  const assigned = controller.assign();
  for (const key of Object.keys(data)) {
    if (Object.hasOwn(assigned, key) || ['__proto__', 'prototype', 'constructor'].includes(key)) {
      throw new TypeError(`Plugin theme data cannot replace ${key}`);
    }
  }
  controller.assign(data);
  return controller.renderThemeView(templateName);
};
