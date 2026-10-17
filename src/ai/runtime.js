'use strict';

const MAX_INPUT = 40000;
const TASK_PROMPTS = Object.freeze({
  'post.summary': '请根据文章生成准确、简洁的中文摘要，不超过 180 个汉字。仅返回摘要，不要添加标题，不要编造事实。',
  'post.polish': '请对文章进行中文语言润色，保留事实、技术术语、Markdown 结构、链接、代码块和代码内容。只输出润色后的完整 Markdown，不添加说明。'
});

class AIRuntime {
  constructor() {
    this.providers = new Map();
  }

  registerProvider(name, provider, owner = 'core') {
    if (!/^[a-z][a-z0-9._-]*$/.test(name) || !provider ||
        typeof provider.generate !== 'function') throw new TypeError('Invalid AI provider');
    if (this.providers.has(name)) throw new Error('Duplicate AI provider: ' + name);
    this.providers.set(name, {provider, owner});
    return () => this.providers.delete(name);
  }

  removePlugin(owner) {
    for (const [name, item] of this.providers) {
      if (item.owner === owner) this.providers.delete(name);
    }
  }

  list() {
    return [...this.providers.keys()];
  }

  async generate({provider, model, messages, options = {}}) {
    const registered = this.providers.get(provider);
    if (!registered) throw new Error('Unknown AI provider: ' + provider);
    if (typeof model !== 'string' || !model.trim()) throw new TypeError('AI model required');
    if (!Array.isArray(messages) || messages.length < 1 ||
        messages.some(item => !item || !['system', 'user', 'assistant'].includes(item.role) ||
          typeof item.content !== 'string')) throw new TypeError('Invalid messages');
    return registered.provider.generate({model, messages, options});
  }

  async runTask(task, content, config) {
    if (!Object.hasOwn(TASK_PROMPTS, task)) throw new TypeError('Unsupported AI task');
    if (typeof content !== 'string' || !content.trim() || content.length > MAX_INPUT) {
      throw new TypeError('Invalid AI content');
    }
    const result = await this.generate({
      provider: config.provider, model: config.model,
      messages: [
        {role: 'system', content: TASK_PROMPTS[task]},
        {role: 'user', content}
      ],
      options: {temperature: 0.3}
    });
    if (!result || typeof result.text !== 'string' || !result.text.trim()) {
      throw new Error('Empty AI response');
    }
    return {text: result.text, model: config.model, task};
  }
}

module.exports = {AIRuntime, TASK_PROMPTS};
