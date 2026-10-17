'use strict';

const Base = require('./base');
const {getContext} = require('../../../../lib/project-context');

module.exports = class extends Base {
  async postAction() {
    const config = (getContext().config || {}).ai || {};
    if (!config.provider || !config.model) return this.fail('AI_NOT_CONFIGURED');
    const input = this.post();
    if (!input || !['post.summary', 'post.polish'].includes(input.task) ||
        typeof input.markdown_content !== 'string' ||
        !input.markdown_content.trim() || input.markdown_content.length > 40000) {
      return this.fail('PARAMS_ERROR');
    }
    try {
      const result = await global.firekylin.plugins.ai.runTask(
        input.task, input.markdown_content, config
      );
      // Preview only. Persisting the response requires normal article save.
      return this.success(result);
    } catch (error) {
      think.logger.error('[ai] Generate failed: ' + error.message);
      return this.fail('AI_GENERATION_FAILED');
    }
  }
};
