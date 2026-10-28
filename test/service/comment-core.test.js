'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {createCommentCore} = require('../../src/vendor/comment-core.cjs');

class MemoryModel {
  constructor() { this.rows = []; this.nextId = 1 }
  matches(row, where = {}) {
    return Object.entries(where).every(([key, value]) => {
      if (key === '_complex') return this.matches(row, value);
      if (key === '_logic') return true;
      if (!Array.isArray(value)) return row[key] === value;
      const [operator, operand] = value;
      if (operator === 'IN') return operand.includes(row[key]);
      if (operator === 'NOT IN') return !operand.includes(row[key]);
      if (operator === '!=') return row[key] !== operand;
      if (operator === '>') return row[key] > operand;
      return true;
    });
  }
  async select(where = {}, options = {}) {
    let rows = this.rows.filter(row => this.matches(row, where));
    if (options.order) {
      const order = options.order;
      rows = rows.sort((a, b) => {
        for (const item of order) {
          if (a[item.field] === b[item.field]) continue;
          const result = a[item.field] > b[item.field] ? 1 : -1;
          return item.direction === 'desc' ? -result : result;
        }
        return 0;
      });
    }
    return rows.slice(options.offset || 0, options.limit ? (options.offset || 0) + options.limit : undefined).map(row => ({...row}));
  }
  async count(where = {}) { return this.rows.filter(row => this.matches(row, where)).length }
  async add(data) { const row = {...data, objectId: String(this.nextId++)}; this.rows.push(row); return {...row} }
  async update(data, where) {
    return this.rows.filter(row => this.matches(row, where)).map(row => {
      Object.assign(row, typeof data === 'function' ? data(row) : data);
      return {...row};
    });
  }
  async delete(where) { this.rows = this.rows.filter(row => !this.matches(row, where)) }
}

test('vendored comment core creates, lists and counts comments', async() => {
  const Comment = new MemoryModel();
  const core = createCommentCore({
    models: {Comment, Counter: new MemoryModel(), Users: new MemoryModel()},
    services: {markdown: {render: value => `<p>${value}</p>`}}
  });
  const ctx = {headers: {}, state: {}, ip: '127.0.0.1'};
  const created = await core.comment.create({url: '/post/hello.html', comment: 'Hello', nick: 'Tester'}, ctx);
  assert.equal(created.comment, '<p>Hello</p>');
  const list = await core.comment.list({path: '/post/hello.html'}, ctx);
  assert.equal(list.count, 1);
  assert.equal(list.data[0].nick, 'Tester');
  assert.deepEqual(await core.comment.count({url: '/post/hello.html'}, ctx), [1]);
});

test('vendored comment core keeps waiting comments private', async() => {
  const Comment = new MemoryModel();
  const core = createCommentCore({models: {Comment, Counter: new MemoryModel(), Users: new MemoryModel()}, config: {audit: true}});
  const ctx = {headers: {}, state: {}, ip: '127.0.0.1'};
  await core.comment.create({url: '/post/a.html', comment: 'Review me'}, ctx);
  assert.equal((await core.comment.list({path: '/post/a.html'}, ctx)).count, 0);
});

test('comment list includes parsed browser and operating system', async() => {
  const core = createCommentCore({
    models: {Comment: new MemoryModel(), Counter: new MemoryModel(), Users: new MemoryModel()},
    services: {userAgent: require('../../src/service/comment-user-agent')}
  });
  const ctx = {headers: {}, state: {}, ip: '127.0.0.1'};
  await core.comment.create({url: '/post/a.html', comment: 'Hello', nick: 'Tester', ua: 'Windows NT 10.0 Chrome/120.0 Safari/537.36'}, ctx);
  const list = await core.comment.list({path: '/post/a.html'}, ctx);
  assert.equal(list.data[0].browser, 'Chrome 120');
  assert.equal(list.data[0].os, 'Windows');
});

test('vendored comment core rejects anonymous comments when login is required', async() => {
  const core = createCommentCore({
    models: {Comment: new MemoryModel(), Counter: new MemoryModel(), Users: new MemoryModel()},
    config: {forceLogin: true}
  });
  const ctx = {headers: {}, state: {}, ip: '127.0.0.1'};

  await assert.rejects(
    core.comment.create({url: '/post/a.html', comment: 'Anonymous'}, ctx),
    error => error.code === 'UNAUTHORIZED' && error.status === 401
  );
});

test('vendored comment core explicitly requests the password only during login', async() => {
  let selectedFields;
  const Users = {
    async select(_where, options = {}) {
      selectedFields = options.field;
      return [{objectId: '1', email: 'user@example.com', password: 'hash', type: 'guest'}];
    }
  };
  const core = createCommentCore({
    models: {Comment: new MemoryModel(), Counter: new MemoryModel(), Users},
    services: {
      password: {verify: async() => true},
      token: {sign: async() => 'token'}
    }
  });

  const result = await core.auth.login({email: 'user@example.com', password: 'password'}, {state: {}});
  assert.ok(selectedFields.includes('password'));
  assert.equal(result.password, undefined);
  assert.equal(result.token, 'token');
});
