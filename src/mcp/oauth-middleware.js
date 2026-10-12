'use strict';

const {OAuthStore} = require('./oauth-store');
const {getContext} = require('../../lib/project-context');
const {scopeList, publicOrigin} = require('./oauth-utils');
const {createOAuthHandler} = require('./oauth');

function oauthMiddleware() {
  let handlerPromise;
  const config = (getContext().config || {}).mcp || {};
  async function handler() {
    if (!handlerPromise) {
      handlerPromise = (async() => {
        const options = await think.model('options').getOptions();
        const origin = publicOrigin(options.site_url);
        return createOAuthHandler({
          origin,
          getModel: name => think.model(name),
          getUser: id => think.model('user').where({id})
            .field('id,name,type,status').setRelation(false).find()
        });
      })().catch(error => { handlerPromise = null; throw error });
    }
    return handlerPromise;
  }

  return async function oauth(ctx, next) {
    if (config.enabled === false) return next();
    if (!ctx.path.startsWith('/oauth/') &&
        !ctx.path.startsWith('/.well-known/oauth-')) return next();
    const handle = await handler();
    return handle(ctx, next);
  };
}

function oauthVerifier() {
  const store = new OAuthStore(name => think.model(name));
  return async function verify(authorization) {
    const match = /^Bearer\s+([A-Za-z0-9_-]{32,256})$/i.exec(authorization || '');
    if (!match) return null;
    const grant = await store.lookup('access', match[1]);
    if (!grant) return null;
    const user = await think.model('user').where({id: grant.user_id})
      .field('id,type,status').setRelation(false).find();
    if (!user || !user.id || Number(user.status) !== 1) return null;
    const options = await think.model('options').getOptions();
    const resource = publicOrigin(options.site_url) + '/mcp';
    if (grant.resource !== resource) return null;
    return {
      principal: {id: Number(user.id), type: Number(user.type)},
      scopes: new Set(scopeList(grant.scopes)),
      tokenId: String(grant.id)
    };
  };
}

module.exports = {oauthMiddleware, oauthVerifier};
