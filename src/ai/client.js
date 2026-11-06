'use strict';

const images = require('../service/ai-images');
const {DEFAULTS, featureFor} = require('../service/ai-editor-features');

function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

class AIClient {
  constructor({providers, preferences, timeout = 60000, audit, featureModels}) {
    this.providers = providers;
    this.preferences = preferences;
    this.timeout = timeout;
    this.audit = audit;
    this.featureModels = featureModels;
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

  async getFeatureModels() {
    return await this.featureModels?.get() || {};
  }

  async setFeatureModels(bindings) {
    if (!bindings || typeof bindings !== 'object' || Array.isArray(bindings)) {
      throw Object.assign(new Error('Invalid feature models'), {status: 400});
    }
    for (const [feature, selection] of Object.entries(bindings)) {
      if (!Object.hasOwn(DEFAULTS, feature) || !selection || typeof selection !== 'object' ||
          typeof selection.provider !== 'string' || typeof selection.model !== 'string') {
        throw Object.assign(new Error('Invalid feature model'), {status: 400});
      }
      if (!await this.availableSelection(selection, feature === 'image' ? 'image' : 'text')) {
        throw Object.assign(new Error(`AI model is unavailable or incompatible: ${feature}`), {status: 400});
      }
    }
    await this.featureModels.set(Object.fromEntries(Object.entries(bindings).map(([key, value]) =>
      [key, {provider: value.provider, model: value.model}])));
  }

  async featureSelection(feature) {
    return (await this.getFeatureModels())[feature];
  }

  async availableSelection(selection, capability = 'text') {
    const provider = this.providers.get(selection?.provider);
    return Boolean(provider && (!provider.configured || await provider.configured()) &&
      provider.models.some(model => model.id === selection.model && model.capabilities.includes(capability)));
  }

  async availableFeature(feature) {
    return this.availableSelection(await this.featureSelection(feature) || await this.preferences.get(),
      feature === 'image' ? 'image' : 'text');
  }

  async select(providerId, modelId) {
    const provider = this.providers.get(nonEmpty(providerId, 'Provider'));
    if (!provider) throw new Error(`AI provider is not available: ${providerId}`);
    if (provider.configured && !await provider.configured()) {
      throw Object.assign(new Error(`AI provider is not configured: ${providerId}`), {status: 400});
    }
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
    context.onRequestId?.(entry?.request_id);
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
    const scenario = context.scenario;
    const feature = scenario === 'comment.moderation' ? 'commentModeration'
      : scenario === 'comment.reply' ? 'commentReply'
        : scenario === 'editor.cover' || scenario === 'media.image' ? 'image'
          : typeof scenario === 'string' && scenario.startsWith('editor.') ? featureFor(scenario.slice(7)) : undefined;
    const selected = (!request.provider && !request.model && feature && await this.featureSelection(feature)) ||
      await this.preferences.get();
    const providerId = request.provider || selected.provider;
    const modelId = request.model || selected.model;
    state.request = {...request, provider: providerId, model: modelId};
    const provider = this.providers.get(nonEmpty(providerId, 'Provider'));
    if (!provider) throw new Error(`AI provider is not available: ${providerId}`);
    if (provider.configured && !await provider.configured()) throw new Error(`AI provider is not configured: ${providerId}`);
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
        {...request, provider: providerId, model: modelId}, {...context, signal, reportUsage, images,
          ...(context.onText ? {
          onText: delta => { if (active && !signal.aborted) context.onText(delta) }
        } : {})})), aborted]);
      return state.usageMetadata && result && typeof result === 'object' ? {...result, ...state.usageMetadata} : result;
    } finally {
      active = false;
      signal.removeEventListener('abort', onAbort);
      clearTimeout(timer);
    }
  }
}

module.exports = AIClient;
