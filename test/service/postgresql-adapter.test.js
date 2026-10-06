const test = require('node:test');
const assert = require('node:assert/strict');
const PostgreSQLAdapter = require('think-model-postgresql');

test('escapes backslashes before quotes in PostgreSQL strings', () => {
  const parser = new PostgreSQLAdapter.Parser();
  const quote = String.fromCharCode(39);
  const source = ['javascript:({do: ', '\\', quote, 'like', '\\', quote, '})'].join('');
  const sql = parser.parseValue(source);
  const escapedQuote = ['\\', '\\', '\\', quote].join('');
  const expected = ['E', quote, 'javascript:({do: ', escapedQuote, 'like', escapedQuote, '})', quote].join('');

  assert.equal(sql, expected);
});
