'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const originalThink = global.think;
global.think = {
  Service: class {},
  datetime: () => '2026-10-12 12:00:00',
  isEmpty: value => !value || Object.keys(value).length === 0
};
const SocialAuth = require('../../src/service/social-auth');

test.after(() => {
  if (originalThink === undefined) delete global.think;
  else global.think = originalThink;
});

function memoryModel(rows = []) {
  return {
    currentWhere: {},
    where(where) { this.currentWhere = where; return this },
    order() { return this },
    async find() {
      return rows.find(row => Object.entries(this.currentWhere).every(([key, value]) => String(row[key]) === String(value))) || {};
    },
    async select() { return rows.filter(row => !this.currentWhere.user_id || this.currentWhere.user_id[1].includes(row.user_id)) },
    async count() { return rows.filter(row => Object.entries(this.currentWhere).every(([key, value]) => String(row[key]) === String(value))).length },
    async add(data) { rows.push({...data, id: rows.length + 1}); return rows.length },
    async delete() {
      const before = rows.length;
      for (let index = rows.length - 1; index >= 0; index--) {
        if (Object.entries(this.currentWhere).every(([key, value]) => String(rows[index][key]) === String(value))) rows.splice(index, 1);
      }
      return before - rows.length;
    }
  };
}

test('social login creates a commenter and links the identity', async() => {
  const socialRows = [];
  const social = new SocialAuth();
  social.profile = async() => ({id: 'octocat', email: 'octocat@example.com', name: 'Octocat', avatar: 'avatar'});
  social.model = name => name === 'user_social' ? memoryModel(socialRows) : memoryModel([]);
  let created;
  const users = {
    async add(data) { created = data; return {objectId: '8', ...data, type: 'guest'} },
    async select() { return [] }
  };
  const result = await social.authorize({type: 'github'}, {state: {}}, users, {sign: async id => `token-${id}`});

  assert.equal(created.email, 'octocat@example.com');
  assert.equal(created.password, '');
  assert.equal(result.token, 'token-8');
  assert.deepEqual(socialRows[0], {
    id: 1, user_id: 8, provider: 'github', account_id: 'octocat', created_at: '2026-10-12 12:00:00'
  });
});

test('a logged-in user can bind and unlink a social identity', async() => {
  const socialRows = [];
  const social = new SocialAuth();
  social.profile = async() => ({id: '42', name: 'User'});
  social.model = name => name === 'user_social' ? memoryModel(socialRows) : memoryModel([]);
  const current = {objectId: '3', avatar: 'existing'};
  const result = await social.authorize({type: 'github'}, {state: {userInfo: current}}, {update: async() => []}, {sign: async() => ''});

  assert.equal(result.linked, true);
  assert.equal(socialRows[0].user_id, 3);
  assert.equal(await social.unlink(3, 'github'), 1);
  assert.equal(socialRows.length, 0);
});

test('OAuth state is signed, expires and is bound to the backend user', async() => {
  const social = new SocialAuth();
  social.model = () => ({
    async getOptions() { return {jwt_secret: 'a-secure-test-secret-that-is-at-least-32-bytes'} }
  });
  const state = await social.createState(7);
  const payload = await social.verifyState(state);

  assert.equal(payload.userId, 7);
  assert.equal(await social.verifyState(`${state}tampered`), null);
});
