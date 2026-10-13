'use strict';

const {getMcpConfig} = require('./config');
const {createMcpEndpoint} = require('./server');
const {oauthVerifier} = require('./oauth-middleware');
const {publicOrigin} = require('./oauth-utils');

module.exports = function builtinMcp() {
  const config = getMcpConfig();
  let endpointPromise;
  return async function mcpMiddleware(ctx, next) {
    if (ctx.path !== '/mcp') return next();

    // The protocol endpoint is built into every site, but is opt-in for
    // remote access: without credentials no request can authenticate.
    if (config.enabled === false) return ctx.throw(404);

    if (!endpointPromise) {
      endpointPromise = (async() => {
        const options = await think.model('options').getOptions();
        const origin = publicOrigin(options.site_url);
        return createMcpEndpoint({
          tools: {
            list: () => global.firekylin.plugins.tools.list(),
            execute: (name, input, context) => global.firekylin.plugins.tools.execute(name, input, context)
          },
          config,
          verifier: oauthVerifier(),
          resourceMetadataUrl: origin + '/.well-known/oauth-protected-resource/mcp',
          logger: think.logger
        });
      })().catch(error => {
        endpointPromise = null;
        throw error;
      });
    }
    const endpoint = await endpointPromise;
    await endpoint(ctx);
  };
};
