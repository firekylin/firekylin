'use strict';

const {createMcpEndpoint} = require('./server');

module.exports = {
  async register(ctx) {
    const endpoint = await createMcpEndpoint({
      tools: ctx.tools,
      config: ctx.config,
      logger: ctx.logger,
      getUser: async id => {
        const user = await think.model('user')
          .where({id})
          .field('id,type,status')
          .setRelation(false)
          .find();
        return user;
      }
    });
    ctx.routes.register({
      method: ['POST', 'GET', 'DELETE'],
      path: '/mcp',
      auth: 'public',
      // Bearer token instead of browser session. We validate Origin in the handler.
      csrf: false,
      async handler({ctx: requestContext}) {
        await endpoint(requestContext);
      }
    });
  }
};
