'use strict';

const {positiveInteger, input, summary} = require('./shared');

module.exports = queries => ({
  name: 'posts.get', description: 'Read a publicly published blog article by numeric ID',
  requiredPermissions: ['posts:read'],
  inputSchema: {type: 'object', additionalProperties: false,
    properties: {id: {type: 'integer', minimum: 1}}, required: ['id']},
  async execute(raw = {}) {
    const post = await queries.getPublic(positiveInteger(input(raw).id, undefined, Number.MAX_SAFE_INTEGER));
    return post && post.id ? {...summary(post), markdown_content: post.markdown_content} : null;
  }
});
