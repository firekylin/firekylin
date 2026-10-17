'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const McpAuthorizationService = require('../../src/service/mcp-authorizations');
const {toolAnnotations} = require('../../src/mcp/server');

function fakeModels() {
  const grants = [
    {client_id: 'fk_' + 'a'.repeat(43), user_id: 1, scopes: 'posts:read posts:write',
      created_at: 100, expires_at: 99999, kind: 'access', revoked: 0},
    {client_id: 'fk_' + 'a'.repeat(43), user_id: 1, scopes: 'posts:read',
      created_at: 200, expires_at: 99999, kind: 'refresh', revoked: 0},
    {client_id: 'fk_' + 'b'.repeat(43), user_id: 2, scopes: 'posts:delete',
      created_at: 100, expires_at: 99999, kind: 'access', revoked: 0}
  ];
  const clients = [
    {client_id: grants[0].client_id, name: 'My Agent'},
    {client_id: grants[2].client_id, name: 'Another User'}
  ];
  const factory = tableName => {
    const rows = tableName === 'mcp_oauth_grant' ? grants : clients;
    let condition = {};
    return {
      where(next) {condition = next; return this},
      field() {return this},
      setRelation() {return this},
      async select() {
        return rows.filter(row => Object.entries(condition).every(([key, val]) => {
          if (Array.isArray(val)) {
            if (val[0] === 'IN') return val[1].includes(row[key]);
            if (val[0] === '>') return row[key] > val[1];
          }
          return row[key] === val;
        }));
      },
      async update(change) {
        const selected = rows.filter(row => row.client_id === condition.client_id && row.user_id === condition.user_id);
        selected.forEach(row => Object.assign(row, change));
        return selected.length;
      }
    };
  };
  return {factory, grants};
}

test('authorized apps are scoped to current user and redact all secrets', async() => {
  const {factory} = fakeModels();
  const service = new McpAuthorizationService(factory, () => 1000);
  const apps = await service.list(1);
  assert.equal(apps.length, 1);
  assert.equal(apps[0].name, 'My Agent');
  assert.deepEqual(apps[0].scopes, ['posts:read', 'posts:write']);
  assert.equal(Object.hasOwn(apps[0], 'token_hash'), false);
  assert.equal(Object.hasOwn(apps[0], 'user_id'), false);
});

test('revocation only affects caller grants', async() => {
  const {factory, grants} = fakeModels();
  const service = new McpAuthorizationService(factory, () => 1000);
  await service.revoke(1, 'fk_' + 'a'.repeat(43));
  assert.equal(grants[0].revoked, 1);
  assert.equal(grants[1].revoked, 1);
  assert.equal(grants[2].revoked, 0);
  assert.deepEqual(await service.list(1), []);
});

test('annotation hints do not suggest mutating tools are read-only', () => {
  assert.equal(toolAnnotations({name: 'posts.get'}).readOnlyHint, true);
  assert.equal(toolAnnotations({name: 'posts.createDraft'}).readOnlyHint, false);
  assert.equal(toolAnnotations({name: 'posts.delete'}).destructiveHint, true);
});
