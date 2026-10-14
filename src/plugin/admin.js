'use strict';

const ID_PATTERN = /^[a-z][a-z0-9._-]*$/i;
const FIELD_TYPES = new Set(['text', 'textarea', 'number', 'switch', 'select', 'password']);
const ACTION_TYPES = new Set(['default', 'primary', 'danger']);
const SECTION_TYPES = new Set([
  'text', 'description', 'table', 'stat', 'list', 'markdown', 'image', 'progress', 'empty', 'divider',
  'links', 'code', 'grid', 'form', 'actions'
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
    order: page.order
  };
}

function normalizeFields(fields, formId) {
  if (!Array.isArray(fields) || !fields.length) throw new TypeError(`Admin form ${formId} requires fields`);
  const names = new Set();
  return fields.map(field => {
    if (!field || typeof field !== 'object') throw new TypeError(`Admin form ${formId} field must be an object`);
    const name = identifier(field.name, `Admin form ${formId} field name`);
    if (names.has(name)) throw new Error(`Duplicate admin form field: ${formId}.${name}`);
    names.add(name);
    const type = field.type || 'text';
    if (!FIELD_TYPES.has(type)) throw new TypeError(`Unsupported admin form field type: ${type}`);
    if (type === 'select' && (!Array.isArray(field.options) || !field.options.length)) {
      throw new TypeError(`Select field ${formId}.${name} requires options`);
    }
    const normalized = {
      name,
      type,
      label: requiredString(field.label, `Admin form ${formId}.${name} label`),
      description: typeof field.description === 'string' ? field.description : undefined,
      placeholder: typeof field.placeholder === 'string' ? field.placeholder : undefined,
      required: field.required === true
    };
    if (field.options) normalized.options = field.options.map(option => ({
      label: requiredString(option.label, `Admin form ${formId}.${name} option label`),
      value: option.value
    }));
    return normalized;
  });
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
  });
}

class AdminRegistry {
  constructor() {
    this.panels = new Map();
    this.pages = new Map();
    this.forms = new Map();
    this.actions = new Map();
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

  manifest() {
    const plugins = new Map();
    const ensure = pluginId => {
      if (!plugins.has(pluginId)) plugins.set(pluginId, {id: pluginId, panels: [], pages: [], forms: [], actions: []});
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
    for (const plugin of plugins.values()) {
      plugin.panels.sort((a, b) => a.order - b.order);
      plugin.pages.sort((a, b) => a.order - b.order);
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
      .filter(field => Object.prototype.hasOwnProperty.call(values || {}, field.name))
      .map(field => [field.name, values[field.name]]));
    for (const field of form.fields) {
      const value = allowed[field.name];
      if (field.required && (typeof value === 'undefined' || value === null || value === '')) {
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
    for (const registry of [this.panels, this.pages, this.forms, this.actions]) {
      for (const [key, value] of registry) if (value.pluginId === pluginId) registry.delete(key);
    }
  }
}

module.exports = AdminRegistry;
