'use strict';

const {OAuthStore} = require('../mcp/oauth-store');
const {buildOAuthHandler} = require('../mcp/oauth');
const {publicOrigin, scopeList} = require('../mcp/oauth-utils');
const adminAuth = require('../service/admin-auth');

const RESOURCE = '/desktop/v1';
const SCOPES = new Set(['desktop:content']);

function allowed(scopes, user) {
  const constants = global.firekylin;
  return Boolean(user && Number(user.status) === constants.USER_AVAILABLE &&
    [constants.USER_ADMIN, constants.USER_EDITOR, constants.USER_CONTRIBUTOR].includes(Number(user.type)) &&
    scopes.length === 1 && scopes[0] === 'desktop:content');
}

function desktopAuth() {
  const store = new OAuthStore(name => think.model(name));
  let handler;
  let handlerOrigin;
  async function configuration() {
    const options = await think.model('options').getOptions();
    return {options, origin: publicOrigin(options.site_url)};
  }
  async function user(id) {
    return think.model('user').where({id}).setRelation(false)
      .field('id,name,display_name,avatar,type,status')
      .find();
  }
  return {
    configuration,
    async oauth(ctx, next) {
      const {origin} = await configuration();
      if (!handler || handlerOrigin !== origin) {
        handlerOrigin = origin;
        handler = buildOAuthHandler({
        origin, store, getUser: user, resourcePath: RESOURCE,
        endpointPrefix: '/desktop/oauth', metadataSuffix: '/desktop',
        supportedScopes: SCOPES, scopePolicy: allowed,
        getCurrentUser: async request => {
          const options = await think.model('options').getOptions(true);
          request.state.jwtSecret = options.jwt_secret || options.comment_jwt_secret;
          return adminAuth.currentUser(request);
        }
      });
      }
      return handler(ctx, next);
    },
    async verify(header) {
      const match = /^Bearer\s+([A-Za-z0-9_-]{32,256})$/i.exec(header || '');
      if (!match) return null;
      const grant = await store.lookup('access', match[1]);
      if (!grant) return null;
      const {origin} = await configuration();
      if (grant.resource !== origin + RESOURCE) return null;
      const principal = await user(grant.user_id);
      return allowed(scopeList(grant.scopes), principal) ? principal : null;
    }
  };
}

module.exports = {RESOURCE, SCOPES, allowed, desktopAuth};
