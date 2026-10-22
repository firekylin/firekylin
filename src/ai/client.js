'use strict';

function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

class AIClient {
  constructor({providers, preferences, timeout = 60000}) {
    this.providers = providers;
    this.preferences = preferences;
    this.timeout = timeout;
  }

  async models() {
    const selected = await this.preferences.get();
    return Promise.all(this.providers.list().map(async provider => ({...provider,
      ...(this.providers.get(provider.id).configured ? {
        configured: Boolean(await this.providers.get(provider.id).configured())
      } : {}),
      models: provider.models.map(model => ({...model,
        selected: selected.provider === provider.id && selected.model === model.id
      }))
    })));
  }

  async select(providerId, modelId) {
    const provider = this.providers.get(nonEmpty(providerId, 'Provider'));
    if (!provider) throw new Error(`AI provider is not available: ${providerId}`);
    if (!provider.models.some(model => model.id === modelId)) {
      throw new Error(`AI model is not available: ${providerId}/${modelId}`);
    }
    await this.preferences.set({provider: provider.id, model: modelId});
    return {provider: provider.id, model: modelId};
  }

  async clear() {
    await this.preferences.set({});
  }

  async generate(request, context = {}) {
    if (!request || typeof request !== 'object' || Array.isArray(request)) {
      throw new TypeError('AI request must be an object');
    }
    const selected = await this.preferences.get();
    const providerId = request.provider || selected.provider;
    const modelId = request.model || selected.model;
    const provider = this.providers.get(nonEmpty(providerId, 'Provider'));
    if (!provider) throw new Error(`AI provider is not available: ${providerId}`);
    const model = provider.models.find(item => item.id === modelId);
    if (!model) {
      throw new Error(`AI model is not available: ${providerId}/${modelId}`);
    }
    const capability = request.capability === undefined ? 'text' : nonEmpty(request.capability, 'AI capability');
    if (!model.capabilities.includes(capability)) {
      const error = new Error(`AI model does not support ${capability}: ${providerId}/${modelId}`);
      error.code = 'AI_UNSUPPORTED_CAPABILITY';
      error.status = 400;
      throw error;
    }
    if (!Array.isArray(request.messages) || !request.messages.length) {
      throw new TypeError('AI request requires messages');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('AI request timed out')), this.timeout);
    try {
      const signal = context.signal
        ? AbortSignal.any([context.signal, controller.signal]) : controller.signal;
      return await provider.generate({...request, provider: providerId, model: modelId}, {
        ...context, signal
      });
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = AIClient;
