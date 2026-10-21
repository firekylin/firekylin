'use strict';

const {positiveInteger, input, summary} = require('./shared');

module.exports = queries => ({
  name: 'posts.search', description: 'Search titles or content of publicly published articles',
  requiredPermissions: ['posts:read'],
  inputSchema: {type: 'object', additionalProperties: false, properties: {
    query: {type: 'string', minLength: 1, maxLength: 120}, limit: {type: 'integer', minimum: 1, maximum: 50}
  }, required: ['query']},
  async execute(raw = {}) {
    const value = input(raw);
    if (typeof value.query !== 'string' || !value.query.trim() || value.query.length > 120) {
      throw new TypeError('Invalid query');
    }
    const rows = await queries.searchPublic({
      query: value.query.trim(), limit: positiveInteger(value.limit, 10, 50)
    });
    return rows.map(summary);
  }
});
