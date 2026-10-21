'use strict';

const PROVIDER_ID = /^[a-z][a-z0-9._-]*$/;

function requiredString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
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
    const provider = Object.freeze({
      id,
      owner,
      label: requiredString(definition.label || id, `AI provider ${id} label`),
      models: normalizeModels(definition.models, id),
      generate: definition.generate
    });
    this.providers.set(id, provider);
    return () => this.providers.delete(id);
  }

  list() {
    return [...this.providers.values()].map(({id, label, models}) => ({id, label, models: clone(models)}));
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
