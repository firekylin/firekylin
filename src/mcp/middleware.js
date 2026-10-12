'use strict';

const {getContext} = require('../../lib/project-context');
const {createMcpEndpoint} = require('./server');
const {oauthVerifier} = require('./oauth-middleware');

module.exports = function builtinMcp() {
  const project = getContext();
  const config = (project.config && project.config.mcp) || {};
  let endpointPromise;
  return async function mcpMiddleware(ctx, next) {
    if (ctx.path !== '/mcp') return next();

    // The protocol endpoint is built into every site, but is opt-in for
    // remote access: without credentials no request can authenticate.
    if (config.enabled === false) return ctx.throw(404);

    if (!endpointPromise) {
      endpointPromise = createMcpEndpoint({
        tools: {
          list: () => global.firekylin.plugins.tools.list(),
          execute: (name, input, context) => global.firekylin.plugins.tools.execute(name, input, context)
        },
        config,
        verifier: oauthVerifier(),
        resourceMetadataUrl: '/.well-known/oauth-protected-resource/mcp',
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
