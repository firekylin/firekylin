'use strict';

const {OAuthStore} = require('../mcp/oauth-store');

class McpAuthorizationService {
  constructor(getModel, now = () => Date.now()) {
    if (typeof getModel !== 'function') throw new TypeError('Model factory required');
    this.getModel = getModel;
    this.now = now;
  }

  async list(userId) {
    if (!Number.isSafeInteger(userId) || userId <= 0) throw new TypeError('Invalid user ID');
    // Join in application code: no token secrets are ever selected or serialized.
    const grants = await this.getModel('mcp_oauth_grant')
      .where({user_id: userId, revoked: 0, kind: ['IN', ['access', 'refresh']],
        expires_at: ['>', this.now()]})
      .field('client_id,scopes,created_at,expires_at,kind').setRelation(false).select();
    const clientIds = [...new Set(grants.map(item => item.client_id))];
    if (!clientIds.length) return [];
    const clients = await this.getModel('mcp_oauth_client')
      .where({client_id: ['IN', clientIds]}).field('client_id,name').setRelation(false).select();
    const clientMap = new Map(clients.map(item => [item.client_id, item.name]));
    const grouped = new Map();
    for (const grant of grants) {
      if (!clientMap.has(grant.client_id)) continue;
      const current = grouped.get(grant.client_id) || {
        clientId: grant.client_id, name: clientMap.get(grant.client_id),
        scopes: new Set(), authorizedAt: Number(grant.created_at) || 0,
        expiresAt: 0
      };
      for (const scope of String(grant.scopes || '').split(' ').filter(Boolean)) current.scopes.add(scope);
      current.authorizedAt = Math.min(current.authorizedAt, Number(grant.created_at) || 0);
      current.expiresAt = Math.max(current.expiresAt, Number(grant.expires_at) || 0);
      grouped.set(grant.client_id, current);
    }
    return [...grouped.values()].map(item => ({
      clientId: item.clientId, name: item.name, scopes: [...item.scopes].sort(),
      authorizedAt: item.authorizedAt, expiresAt: item.expiresAt
    })).sort((a, b) => b.authorizedAt - a.authorizedAt);
  }

  async revoke(userId, clientId) {
    if (!Number.isSafeInteger(userId) || userId <= 0 ||
        typeof clientId !== 'string' || !/^fk_[A-Za-z0-9_-]{20,100}$/.test(clientId)) {
      throw new TypeError('Invalid authorization');
    }
    const store = new OAuthStore(this.getModel);
    // Scoped to the authenticated user; never revoke another user's grants.
    await store.invalidateClientTokens(clientId, userId);
    return {revoked: true};
  }
}

module.exports = McpAuthorizationService;
