'use strict';

const PROVIDER_ID = /^[a-z][a-z0-9._-]*$/;

function requiredString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

function optionalString(value, label) {
  return value === undefined ? undefined : requiredString(value, label);
}

function logoUrl(value) {
  const logo = optionalString(value, 'AI provider logo');
  if (logo === undefined) return undefined;
  if (logo.startsWith('/') && !logo.startsWith('//')) return logo;
  try {
    const url = new URL(logo);
    if (url.protocol === 'https:' && !url.username && !url.password) return logo;
  } catch { /* Invalid URL below. */ }
  throw new TypeError('AI provider logo must be an HTTPS or site-relative URL');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeModels(models, providerId) {
  if (!Array.isArray(models) || !models.length) throw new TypeError(`AI provider ${providerId} requires models`);
  const ids = new Set();
  return models.map(model => {
    if (!model || typeof model !== 'object') throw new TypeError(`AI provider ${providerId} model must be an object`);
    const id = requiredString(model.id, `AI provider ${providerId} model id`);
    if (ids.has(id)) throw new Error(`Duplicate AI model: ${providerId}/${id}`);
    ids.add(id);
    const capabilities = Array.isArray(model.capabilities) ? [...new Set(model.capabilities)] : ['text'];
    if (capabilities.some(item => typeof item !== 'string' || !item.trim())) {
      throw new TypeError(`Invalid AI model capability: ${providerId}/${id}`);
    }
    return Object.freeze({id, label: requiredString(model.label || id, `AI model ${id} label`), capabilities});
  });
}

class AIProviderRegistry {
  constructor() {
    this.providers = new Map();
  }

  register(definition, owner = 'core') {
    if (!definition || typeof definition !== 'object') throw new TypeError('AI provider must be an object');
    const id = requiredString(definition.id, 'AI provider id');
    if (!PROVIDER_ID.test(id)) throw new TypeError(`Invalid AI provider id: ${id}`);
    if (this.providers.has(id)) throw new Error(`AI provider already registered: ${id}`);
    if (typeof definition.generate !== 'function') throw new TypeError(`AI provider ${id} requires generate(request, context)`);
    const admin = definition.admin;
    if (admin && (!admin.formId || !admin.testActionId ||
        !PROVIDER_ID.test(admin.formId) || !PROVIDER_ID.test(admin.testActionId))) {
      throw new TypeError(`Invalid AI provider admin configuration: ${id}`);
    }
    const provider = Object.freeze({
      id,
      owner,
      label: requiredString(definition.label || id, `AI provider ${id} label`),
      description: optionalString(definition.description, `AI provider ${id} description`),
      logo: logoUrl(definition.logo),
      models: normalizeModels(definition.models, id),
      configured: typeof definition.configured === 'function' ? definition.configured : undefined,
      admin: admin ? Object.freeze({pluginId: owner, formId: admin.formId,
        testActionId: admin.testActionId}) : undefined,
      generate: definition.generate
    });
    this.providers.set(id, provider);
    return () => this.providers.delete(id);
  }

  list() {
    return [...this.providers.values()].map(({id, label, description, logo, models, admin}) => ({id, label,
      ...(description ? {description} : {}), ...(logo ? {logo} : {}), models: clone(models),
      ...(admin ? {admin: {...admin}} : {})}));
  }

  has(id) {
    return this.providers.has(id);
  }

  get(id) {
    return this.providers.get(id);
  }

  removeOwner(owner) {
    for (const [id, provider] of this.providers) if (provider.owner === owner) this.providers.delete(id);
  }
}

module.exports = AIProviderRegistry;
