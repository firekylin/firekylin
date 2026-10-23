'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {credentialKey} = require('../../src/ai/store');

const originalThink = global.think;
global.think = {
  Model: class {},
  isEmpty: value => !value || Object.keys(value).length === 0,
  isString: value => typeof value === 'string'
};

const Options = require('../../src/model/options');

global.think = originalThink;

class MemoryOptions extends Options {
  constructor(rows) {
    super();
    this.rows = rows;
  }

  where({key}) {
    return {
      find: async() => this.rows.has(key) ? {key, value: this.rows.get(key)} : {},
      update: async({value}) => {
        if (!this.rows.has(key)) return 0;
        this.rows.set(key, value);
        return 1;
      },
      delete: async() => this.rows.delete(key)
    };
  }

  async add({key, value}) {
    // Yield to reproduce inserts racing across independent model instances.
    await new Promise(resolve => setImmediate(resolve));
    if (this.rows.has(key)) throw Object.assign(new Error('duplicate key'), {code: '23505'});
    this.rows.set(key, value);
  }

  async select() {
    return [...this.rows].map(([key, value]) => ({key, value}));
  }
}

test('separate option rows preserve concurrent credentials and hide them from public options', async() => {
  const rows = new Map([['title', 'Example']]);
  const first = new MemoryOptions(rows);
  const second = new MemoryOptions(rows);
  const firstKey = credentialKey('openai', 'apiKey');
  const secondKey = credentialKey('other', 'apiKey');
  await Promise.all([
    first.setCredentialValue(firstKey, 'encrypted-one'),
    second.setCredentialValue(secondKey, 'encrypted-two')
  ]);
  assert.equal(await first.getCredentialValue(firstKey), 'encrypted-one');
  assert.equal(await second.getCredentialValue(secondKey), 'encrypted-two');
  global.think = {isEmpty: value => !value || Object.keys(value).length === 0,
    isString: value => typeof value === 'string'};
  try {
    const publicOptions = await first.getOptions();
    assert.equal(publicOptions[firstKey], undefined);
    assert.equal(publicOptions[secondKey], undefined);
    assert.equal(publicOptions.title, 'Example');
  } finally {
    global.think = originalThink;
  }
  await first.deleteCredentialValue(firstKey);
  assert.equal(await first.getCredentialValue(firstKey), undefined);
  assert.equal(await second.getCredentialValue(secondKey), 'encrypted-two');
});

test('racing inserts for the same credential key retry against the existing row', async() => {
  const rows = new Map();
  const key = credentialKey('openai', 'apiKey');
  await Promise.all([
    new MemoryOptions(rows).setCredentialValue(key, 'first'),
    new MemoryOptions(rows).setCredentialValue(key, 'second')
  ]);
  assert.equal(rows.get(key), 'second');
});

test('core option migration inserts once and never overwrites saved settings', async() => {
  const rows = new Map();
  const key = 'ai_content_features';
  const results = await Promise.all([
    new MemoryOptions(rows).ensureOption(key, '{"slug":true}'),
    new MemoryOptions(rows).ensureOption(key, '{"slug":false}')
  ]);
  assert.deepEqual(results, ['{"slug":true}', '{"slug":true}']);
  rows.set(key, '{"slug":false,"autocomplete":true}');
  assert.equal(await new MemoryOptions(rows).ensureOption(key, '{"slug":true}'),
    '{"slug":false,"autocomplete":true}');
});
