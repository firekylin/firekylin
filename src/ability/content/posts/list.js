'use strict';

const {positiveInteger, input, summary} = require('./shared');

module.exports = queries => ({
  name: 'posts.list', description: 'List publicly published blog articles, newest first',
  requiredPermissions: ['posts:read'],
  inputSchema: {type: 'object', additionalProperties: false, properties: {
    page: {type: 'integer', minimum: 1, maximum: 10000}, limit: {type: 'integer', minimum: 1, maximum: 50}
  }},
  async execute(raw = {}) {
    const value = input(raw);
    const rows = await queries.listPublic({
      page: positiveInteger(value.page, 1, 10000), limit: positiveInteger(value.limit, 10, 50)
    });
    return rows.map(summary);
  }
});
