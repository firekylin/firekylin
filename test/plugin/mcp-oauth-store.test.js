'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {OAuthStore} = require('../../src/mcp/oauth-store');

function database() {
  const tables = {mcp_oauth_client: [], mcp_oauth_grant: []};
  function model(tableName) {
    const table = tables[tableName];
    let filter = {};
    const builder = {
      where(conditions) {filter = conditions; return this;},
      async add(input) {
        table.push({id: table.length + 1, ...input});
        return table.length;
      },
      async find() {
        return table.find(row => Object.entries(filter).every(([key, value]) => row[key] === value)) || {};
      },
      async update(patch) {
        let count = 0;
        for (const row of table) {
          if (Object.entries(filter).every(([key, value]) => row[key] === value)) {
            Object.assign(row, patch);
            count++;
          }
        }
        return count;
      }
    };
    return builder;
  }
  return {tables, model, store: new OAuthStore(model)};
}

test('client registration stores opaque ID and strict callback list', async() => {
  const {tables, store} = database();
  const client = await store.registerClient({
    name: 'Test client', redirectUris: ['http://127.0.0.1:4000/callback']
  });
  assert.match(client.client_id, /^fk_/);
  assert.equal(tables.mcp_oauth_client[0].name, 'Test client');
  assert.deepEqual((await store.client(client.client_id)).redirectUris, client.redirect_uris);
  assert.equal(await store.client('unknown'), null);
});

test('OAuth grant secrets are never persisted in plaintext and are single use', async() => {
  const {tables, store} = database();
  const issued = await store.createGrant('code', {
    userId: 7, clientId: 'client', scopes: ['posts:read'], resource: 'https://blog.example/mcp',
    challenge: 'c'.repeat(43), parent: 'redirect-hash'
  });
  const row = tables.mcp_oauth_grant[0];
  assert.notEqual(row.token_hash, issued);
  assert.equal(row.token_hash.length, 64);
  assert.equal(row.parent_hash, 'redirect-hash');
  assert.equal((await store.lookup('code', issued)).user_id, 7);
  assert.equal((await store.consume('code', issued)).user_id, 7);
  assert.equal(await store.consume('code', issued), null);
});

test('OAuth expiry and explicit revocation immediately invalidate access', async() => {
  const {tables, store} = database();
  const access = await store.createGrant('access', {
    userId: 1, clientId: 'app', scopes: ['posts:read'], resource: 'https://blog.example/mcp'
  });
  await store.revoke(access);
  assert.equal(await store.lookup('access', access), null);
  const expiring = await store.createGrant('access', {
    userId: 1, clientId: 'app', scopes: ['posts:read'], resource: 'https://blog.example/mcp'
  });
  tables.mcp_oauth_grant[1].expires_at = Date.now() - 10;
  assert.equal(await store.lookup('access', expiring), null);
});
