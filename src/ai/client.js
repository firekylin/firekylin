'use strict';

function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

class AIClient {
  constructor({providers, preferences, timeout = 60000, audit}) {
    this.providers = providers;
    this.preferences = preferences;
    this.timeout = timeout;
    this.audit = audit;
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
    const entry = await this.audit?.start(request, context);
    const state = {request, entry};
    try {
      const result = await this.perform(request, context, state);
      await this.audit?.finish(entry, {...state, result});
      return result;
    } catch (error) {
      await this.audit?.finish(entry, {...state, error, failed: true,
        timeout: state.timeout || error?.name === 'TimeoutError' || error?.code === 'ETIMEDOUT',
        cancelled: Boolean(context.signal?.aborted)});
      throw error;
    }
  }

  async perform(request, context, state) {
    if (!request || typeof request !== 'object' || Array.isArray(request)) {
      throw new TypeError('AI request must be an object');
    }
    const selected = await this.preferences.get();
    const providerId = request.provider || selected.provider;
    const modelId = request.model || selected.model;
    state.request = {...request, provider: providerId, model: modelId};
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
    await this.audit?.resolve(state.entry, state.request);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      state.timeout = true;
      controller.abort(new Error('AI request timed out'));
    }, this.timeout);
    const signal = context.signal
      ? AbortSignal.any([context.signal, controller.signal]) : controller.signal;
    let onAbort;
    let active = true;
    const reportUsage = (raw, response) => {
      if (!active || signal.aborted || !provider.usage) return;
      state.usageMetadata = {...state.usageMetadata, ...provider.usage.metadata(raw, response)};
    };
    try {
      const aborted = new Promise((resolve, reject) => {
        onAbort = () => reject(signal.reason || new Error('AI request cancelled'));
        signal.addEventListener('abort', onAbort, {once: true});
        if (signal.aborted) onAbort();
      });
      if (signal.aborted) return await aborted;
      const result = await Promise.race([Promise.resolve().then(() => provider.generate(
        {...request, provider: providerId, model: modelId}, {...context, signal, reportUsage})), aborted]);
      return state.usageMetadata && result && typeof result === 'object' ? {...result, ...state.usageMetadata} : result;
    } finally {
      active = false;
      signal.removeEventListener('abort', onAbort);
      clearTimeout(timer);
    }
  }
}

module.exports = AIClient;
