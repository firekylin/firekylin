'use strict';

const {digest, random} = require('./oauth-utils');

const TTL = {consent: 600, code: 600, access: 3600, refresh: 30 * 86400};

class OAuthStore {
  constructor(model) {
    this.model = model;
  }
  async registerClient({name, redirectUris}) {
    const id = 'fk_' + random();
    await this.model('mcp_oauth_client').add({
      client_id: id, name, redirect_uris: JSON.stringify(redirectUris),
      created_at: Date.now()
    });
    return {client_id: id, client_name: name, redirect_uris: redirectUris,
      token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code']};
  }
  async client(id) {
    if (typeof id !== 'string' || id.length > 256) return null;
    const row = await this.model('mcp_oauth_client').where({client_id: id}).find();
    if (!row || !row.client_id) return null;
    return {id: row.client_id, name: row.name, redirectUris: JSON.parse(row.redirect_uris)};
  }
  async createGrant(kind, {userId, clientId, scopes, resource, challenge, parent}) {
    const secret = random();
    await this.model('mcp_oauth_grant').add({
      token_hash: digest(secret), kind, user_id: userId, client_id: clientId,
      scopes: scopes.join(' '), resource, challenge: challenge || '',
      parent_hash: parent || '', expires_at: Date.now() + TTL[kind] * 1000,
      revoked: 0, created_at: Date.now()
    });
    return secret;
  }
  async lookup(kind, secret) {
    if (typeof secret !== 'string' || secret.length > 256) return null;
    const row = await this.model('mcp_oauth_grant').where({
      kind, token_hash: digest(secret), revoked: 0
    }).find();
    if (!row || !row.id || Number(row.expires_at) <= Date.now()) return null;
    return row;
  }
  async consume(kind, secret) {
    const row = await this.lookup(kind, secret);
    if (!row) return null;
    // An atomic claim guarantees one-time use of authorization codes/refresh tokens.
    const count = await this.model('mcp_oauth_grant').where({
      id: row.id, revoked: 0
    }).update({revoked: 1});
    if (Number(count) !== 1) return null;
    return row;
  }
  async revoke(secret) {
    if (!secret || secret.length > 256) return;
    await this.model('mcp_oauth_grant').where({token_hash: digest(secret)}).update({revoked: 1});
  }
  async invalidateClientTokens(clientId, userId) {
    await this.model('mcp_oauth_grant').where({client_id: clientId, user_id: userId}).update({revoked: 1});
  }
}

module.exports = {OAuthStore, TTL};
