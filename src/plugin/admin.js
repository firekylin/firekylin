'use strict';

const ID_PATTERN = /^[a-z][a-z0-9._-]*$/i;
const FIELD_TYPES = new Set([
  'text', 'textarea', 'number', 'switch', 'select', 'password', 'email', 'url', 'radio', 'checkbox',
  'color', 'code', 'hidden'
]);
const ACTION_TYPES = new Set(['default', 'primary', 'danger']);
const SECTION_TYPES = new Set([
  'text', 'description', 'table', 'stat', 'list', 'markdown', 'image', 'progress', 'empty', 'divider',
  'links', 'code', 'grid', 'tabs', 'form', 'actions'
]);

function requiredString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

function identifier(value, label) {
  const id = requiredString(value, label);
  if (!ID_PATTERN.test(id)) throw new TypeError(`${label} contains unsupported characters: ${id}`);
  return id;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function publicPage(page) {
  return {
    id: page.id,
    title: page.title,
    panel: page.panel,
    description: page.description,
    order: page.order,
    ...(page.menu === false ? {menu: false} : {})
  };
}

function normalizeFields(fields, formId) {
  if (!Array.isArray(fields) || !fields.length) throw new TypeError(`Admin form ${formId} requires fields`);
  const names = new Set();
  const normalizedFields = fields.map(field => {
    if (!field || typeof field !== 'object') throw new TypeError(`Admin form ${formId} field must be an object`);
    const name = identifier(field.name, `Admin form ${formId} field name`);
    if (names.has(name)) throw new Error(`Duplicate admin form field: ${formId}.${name}`);
    names.add(name);
    const type = field.type || 'text';
    if (!FIELD_TYPES.has(type)) throw new TypeError(`Unsupported admin form field type: ${type}`);
    if (['select', 'radio', 'checkbox'].includes(type) && (!Array.isArray(field.options) || !field.options.length)) {
      throw new TypeError(`${type} field ${formId}.${name} requires options`);
    }
    const normalized = {
      name,
      type,
      label: requiredString(field.label, `Admin form ${formId}.${name} label`),
      description: typeof field.description === 'string' ? field.description : undefined,
      placeholder: typeof field.placeholder === 'string' ? field.placeholder : undefined,
      required: field.required === true
    };
    if (typeof field.visibleWhen !== 'undefined') {
      const condition = field.visibleWhen;
      if (!condition || typeof condition !== 'object' || Array.isArray(condition)) {
        throw new TypeError(`Admin form ${formId}.${name} visibleWhen must be an object`);
      }
      const controller = identifier(condition.field, `Admin form ${formId}.${name} visibleWhen field`);
      if (!Array.isArray(condition.values) || !condition.values.length) {
        throw new TypeError(`Admin form ${formId}.${name} visibleWhen.values must be a non-empty array`);
      }
      normalized.visibleWhen = {field: controller, values: clone(condition.values)};
    }
    if (field.options) normalized.options = field.options.map(option => ({
      label: requiredString(option.label, `Admin form ${formId}.${name} option label`),
      value: option.value
    }));
    return normalized;
  });
  for (const field of normalizedFields) {
    if (field.visibleWhen && (!names.has(field.visibleWhen.field) || field.visibleWhen.field === field.name)) {
      throw new TypeError(`Admin form ${formId}.${field.name} visibleWhen references an invalid field`);
    }
  }
  return normalizedFields;
}

function fieldIsVisible(field, values) {
  return !field.visibleWhen || field.visibleWhen.values.includes(values[field.visibleWhen.field]);
}

function validateSections(sections, registry, pluginId, pageId, location = 'sections') {
  if (!Array.isArray(sections)) throw new TypeError(`Admin page ${pageId} ${location} must be an array`);
  sections.forEach((section, index) => {
    const label = `${location}[${index}]`;
    if (!section || typeof section !== 'object' || !SECTION_TYPES.has(section.type)) {
      throw new TypeError(`Admin page ${pageId} has unsupported section at ${label}`);
    }
    if (section.type === 'grid') {
      validateSections(section.items, registry, pluginId, pageId, `${label}.items`);
    }
    if (section.type === 'tabs') {
      if (!Array.isArray(section.items) || !section.items.length) {
        throw new TypeError(`Admin page ${pageId} ${label}.items must be a non-empty array`);
      }
      const keys = new Set();
      section.items.forEach((tab, tabIndex) => {
        if (!tab || typeof tab !== 'object') throw new TypeError(`Admin page ${pageId} ${label} tab must be an object`);
        const key = identifier(tab.key, `Admin page ${pageId} ${label} tab key`);
        if (keys.has(key)) throw new Error(`Duplicate admin tab key: ${key}`);
        keys.add(key);
        requiredString(tab.label, `Admin page ${pageId} ${label} tab label`);
        validateSections(tab.sections, registry, pluginId, pageId, `${label}.items[${tabIndex}].sections`);
      });
    }
    if (section.type === 'form') {
      const formId = identifier(section.id, `Admin page ${pageId} form reference`);
      const form = registry.forms.get(registry.key(pluginId, formId));
      if (!form || form.page !== pageId) throw new Error(`Unknown admin form reference: ${formId}`);
    }
    if (section.type === 'actions' && typeof section.ids !== 'undefined') {
      if (!Array.isArray(section.ids)) throw new TypeError(`Admin page ${pageId} ${label}.ids must be an array`);
      for (const id of section.ids) {
        const actionId = identifier(id, `Admin page ${pageId} action reference`);
        const action = registry.actions.get(registry.key(pluginId, actionId));
        if (!action || action.page !== pageId) throw new Error(`Unknown admin action reference: ${actionId}`);
      }
    }
    if (section.type === 'table' && typeof section.search !== 'undefined') {
      if (section.search !== true &&
          (!section.search || typeof section.search !== 'object' || Array.isArray(section.search))) {
        throw new TypeError(`Admin page ${pageId} ${label}.search must be true or an object`);
      }
      if (section.search && section.search !== true && typeof section.search.keys !== 'undefined' &&
          (!Array.isArray(section.search.keys) || section.search.keys.some(key => typeof key !== 'string' || !key))) {
        throw new TypeError(`Admin page ${pageId} ${label}.search.keys must be an array of strings`);
      }
    }
    if (section.type === 'table' && typeof section.selection !== 'undefined') {
      if (!section.selection || typeof section.selection !== 'object' || Array.isArray(section.selection) ||
          !Array.isArray(section.selection.actions) || !section.selection.actions.length) {
        throw new TypeError(`Admin page ${pageId} ${label}.selection requires actions`);
      }
      if (typeof section.selection.input !== 'undefined') {
        identifier(section.selection.input, `Admin page ${pageId} ${label}.selection input`);
      }
      for (const item of section.selection.actions) {
        if (!item || typeof item !== 'object') {
          throw new TypeError(`Admin page ${pageId} ${label}.selection action must be an object`);
        }
        const actionId = identifier(item.action, `Admin page ${pageId} ${label}.selection action reference`);
        const action = registry.actions.get(registry.key(pluginId, actionId));
        if (!action || action.page !== pageId) throw new Error(`Unknown admin action reference: ${actionId}`);
      }
    }
  });
}

class AdminRegistry {
  constructor() {
    this.panels = new Map();
    this.pages = new Map();
    this.forms = new Map();
    this.actions = new Map();
    this.editorActions = new Map();
  }

  key(pluginId, id) {
    return `${pluginId}:${id}`;
  }

  registerPanel(definition, pluginId = 'core') {
    if (!definition || typeof definition !== 'object') throw new TypeError('Admin panel must be an object');
    const id = identifier(definition.id, 'Admin panel id');
    const key = this.key(pluginId, id);
    if (this.panels.has(key)) throw new Error(`Admin panel already registered: ${id}`);
    const panel = {
      pluginId,
      id,
      title: requiredString(definition.title, `Admin panel ${id} title`),
      icon: typeof definition.icon === 'string' ? definition.icon : 'plugin',
      order: Number.isFinite(definition.order) ? definition.order : 100
    };
    this.panels.set(key, panel);
    return () => this.panels.delete(key);
  }

  registerPage(definition, pluginId = 'core') {
    if (!definition || typeof definition !== 'object') throw new TypeError('Admin page must be an object');
    const id = identifier(definition.id, 'Admin page id');
    const panel = identifier(definition.panel, `Admin page ${id} panel`);
    if (!this.panels.has(this.key(pluginId, panel))) throw new Error(`Unknown admin panel: ${panel}`);
    const key = this.key(pluginId, id);
    if (this.pages.has(key)) throw new Error(`Admin page already registered: ${id}`);
    const page = {
      pluginId,
      id,
      panel,
      title: requiredString(definition.title, `Admin page ${id} title`),
      description: typeof definition.description === 'string' ? definition.description : undefined,
      order: Number.isFinite(definition.order) ? definition.order : 100,
      menu: definition.menu !== false,
      load: typeof definition.load === 'function' ? definition.load : async() => ({})
    };
    this.pages.set(key, page);
    return () => this.pages.delete(key);
  }

  registerForm(definition, pluginId = 'core') {
    if (!definition || typeof definition !== 'object') throw new TypeError('Admin form must be an object');
    const id = identifier(definition.id, 'Admin form id');
    const page = identifier(definition.page, `Admin form ${id} page`);
    if (!this.pages.has(this.key(pluginId, page))) throw new Error(`Unknown admin page: ${page}`);
    if (typeof definition.submit !== 'function') throw new TypeError(`Admin form ${id} requires submit(values, context)`);
    const key = this.key(pluginId, id);
    if (this.forms.has(key)) throw new Error(`Admin form already registered: ${id}`);
    const form = {
      pluginId,
      id,
      page,
      title: requiredString(definition.title, `Admin form ${id} title`),
      submitLabel: typeof definition.submitLabel === 'string' ? definition.submitLabel : '保存',
      fields: normalizeFields(definition.fields, id),
      load: typeof definition.load === 'function' ? definition.load : async() => ({}),
      submit: definition.submit
    };
    this.forms.set(key, form);
    return () => this.forms.delete(key);
  }

  registerAction(definition, pluginId = 'core') {
    if (!definition || typeof definition !== 'object') throw new TypeError('Admin action must be an object');
    const id = identifier(definition.id, 'Admin action id');
    const page = identifier(definition.page, `Admin action ${id} page`);
    if (!this.pages.has(this.key(pluginId, page))) throw new Error(`Unknown admin page: ${page}`);
    if (typeof definition.handler !== 'function') throw new TypeError(`Admin action ${id} requires handler(input, context)`);
    const type = definition.type || 'default';
    if (!ACTION_TYPES.has(type)) throw new TypeError(`Unsupported admin action type: ${type}`);
    const key = this.key(pluginId, id);
    if (this.actions.has(key)) throw new Error(`Admin action already registered: ${id}`);
    const action = {
      pluginId,
      id,
      page,
      label: requiredString(definition.label, `Admin action ${id} label`),
      type,
      confirm: typeof definition.confirm === 'string' ? definition.confirm : undefined,
      handler: definition.handler
    };
    this.actions.set(key, action);
    return () => this.actions.delete(key);
  }

  registerEditorAction(definition, pluginId = 'core') {
    if (!definition || typeof definition !== 'object') throw new TypeError('Editor action must be an object');
    const id = identifier(definition.id, 'Editor action id');
    const action = identifier(definition.action, `Editor action ${id} action`);
    if (!this.actions.has(this.key(pluginId, action))) throw new Error(`Unknown editor action handler: ${action}`);
    const key = this.key(pluginId, id);
    if (this.editorActions.has(key)) throw new Error(`Editor action already registered: ${id}`);
    const editorAction = {
      pluginId, id, action,
      label: requiredString(definition.label, `Editor action ${id} label`),
      order: Number.isFinite(definition.order) ? definition.order : 100
    };
    this.editorActions.set(key, editorAction);
    return () => this.editorActions.delete(key);
  }

  manifest() {
    const plugins = new Map();
    const ensure = pluginId => {
      if (!plugins.has(pluginId)) {
        plugins.set(pluginId, {id: pluginId, panels: [], pages: [], forms: [], actions: [], editorActions: []});
      }
      return plugins.get(pluginId);
    };
    for (const panel of this.panels.values()) ensure(panel.pluginId).panels.push({
      id: panel.id, title: panel.title, icon: panel.icon, order: panel.order
    });
    for (const page of this.pages.values()) ensure(page.pluginId).pages.push(publicPage(page));
    for (const form of this.forms.values()) ensure(form.pluginId).forms.push({
      id: form.id, page: form.page, title: form.title, submitLabel: form.submitLabel, fields: clone(form.fields)
    });
    for (const action of this.actions.values()) ensure(action.pluginId).actions.push({
      id: action.id, page: action.page, label: action.label, type: action.type, confirm: action.confirm
    });
    for (const action of this.editorActions.values()) ensure(action.pluginId).editorActions.push({
      id: action.id, action: action.action, label: action.label, order: action.order
    });
    for (const plugin of plugins.values()) {
      plugin.panels.sort((a, b) => a.order - b.order);
      plugin.pages.sort((a, b) => a.order - b.order);
      plugin.editorActions.sort((a, b) => a.order - b.order);
    }
    return [...plugins.values()].filter(plugin => plugin.pages.length);
  }

  async loadPage(pluginId, pageId, context) {
    const page = this.pages.get(this.key(pluginId, pageId));
    if (!page) return null;
    const loaded = await page.load(context);
    const content = clone(loaded === null || typeof loaded === 'undefined' ? {} : loaded);
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      throw new TypeError(`Admin page ${pageId} load() must return an object`);
    }
    if (typeof content.sections !== 'undefined') validateSections(content.sections, this, pluginId, pageId);
    return {page: publicPage(page), content};
  }

  async loadForm(pluginId, formId, context) {
    const form = this.forms.get(this.key(pluginId, formId));
    if (!form) return null;
    const values = clone(await form.load(context) || {});
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
      throw new TypeError(`Admin form ${formId} load() must return an object`);
    }
    for (const field of form.fields) if (field.type === 'password') delete values[field.name];
    return values;
  }

  async submitForm(pluginId, formId, values, context) {
    const form = this.forms.get(this.key(pluginId, formId));
    if (!form) return null;
    const allowed = Object.fromEntries(form.fields
      .filter(field => fieldIsVisible(field, values || {}) &&
        Object.prototype.hasOwnProperty.call(values || {}, field.name))
      .map(field => [field.name, values[field.name]]));
    for (const field of form.fields) {
      const value = allowed[field.name];
      if (field.required && fieldIsVisible(field, allowed) &&
          (typeof value === 'undefined' || value === null || value === '')) {
        const error = new Error(`Required admin form field is missing: ${field.name}`);
        error.status = 400;
        throw error;
      }
    }
    const result = await form.submit(allowed, context);
    return clone(typeof result === 'undefined' ? {} : result);
  }

  async runAction(pluginId, actionId, input, context) {
    const action = this.actions.get(this.key(pluginId, actionId));
    if (!action) return null;
    const result = await action.handler(clone(input || {}), context);
    return clone(typeof result === 'undefined' ? {} : result);
  }

  removePlugin(pluginId) {
    for (const registry of [this.panels, this.pages, this.forms, this.actions, this.editorActions]) {
      for (const [key, value] of registry) if (value.pluginId === pluginId) registry.delete(key);
    }
  }
}

module.exports = AdminRegistry;
