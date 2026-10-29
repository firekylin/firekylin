const test = require('node:test');
const assert = require('node:assert/strict');
const PostgreSQLAdapter = require('../../src/adapter/postgresql');

test('escapes backslashes before quotes in PostgreSQL strings', () => {
  const parser = new PostgreSQLAdapter.Parser();
  const quote = String.fromCharCode(39);
  const source = ['javascript:({do: ', '\\', quote, 'like', '\\', quote, '})'].join('');
  const sql = parser.parseValue(source);
  const escapedQuote = ['\\', '\\', '\\', quote].join('');
  const expected = ['E', quote, 'javascript:({do: ', escapedQuote, 'like', escapedQuote, '})', quote].join('');

  assert.equal(sql, expected);
});


test('schema errors and missing tables are retried, and metadata is instance-local', async() => {
  const schema = new PostgreSQLAdapter.Schema({}, {}, 'fk_options');
  schema.parser = new PostgreSQLAdapter.Parser();
  let state = 'missing';
  schema.query = {query: async sql => {
    if (state === 'error') throw new Error('connection failed');
    if (!sql.includes('information_schema.columns') || state === 'missing') return [];
    return [{column_name: 'key', data_type: 'text', is_nullable: 'NO'}];
  }};
  await assert.rejects(schema.getSchema(), /does not exist/);
  state = 'error';
  await assert.rejects(schema.getSchema(), /connection failed/);
  state = 'ready';
  assert.deepEqual(Object.keys(await schema.getSchema()), ['key']);
  const other = new PostgreSQLAdapter.Schema({}, {}, 'fk_options');
  other.parser = schema.parser;
  other.query = {query: async() => []};
  await assert.rejects(other.getSchema(), /does not exist/);
});
