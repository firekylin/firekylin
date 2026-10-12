'use strict';

const {getContext} = require('../../lib/project-context');
const {createMcpEndpoint} = require('./server');

let endpointPromise;
let activeConfig;

function mcpConfig() {
  const project = getContext();
  return (project.config && project.config.mcp) || {};
}

module.exports = function builtinMcp() {
  return async function mcpMiddleware(ctx, next) {
    if (ctx.path !== '/mcp') return next();

    const config = mcpConfig();
    // The protocol endpoint is built into every site, but is opt-in for
    // remote access: without credentials no request can authenticate.
    if (config.enabled === false) return ctx.throw(404);

    if (!endpointPromise || activeConfig !== config) {
      activeConfig = config;
      endpointPromise = createMcpEndpoint({
        tools: {
          list: () => global.firekylin.plugins.tools.list(),
          execute: (name, input, context) => global.firekylin.plugins.tools.execute(name, input, context)
        },
        config,
        getUser: async id => think.model('user').where({id})
          .field('id,type,status').setRelation(false).find(),
        logger: think.logger
      }).catch(error => {
        endpointPromise = null;
        throw error;
      });
    }
    const endpoint = await endpointPromise;
    await endpoint(ctx);
  };
};
