const PostgreSQLAdapter = require('think-model-postgresql');

class Parser extends PostgreSQLAdapter.Parser {
  escapeString(value) {
    return value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');
  }
}

class Adapter extends PostgreSQLAdapter {}

Adapter.Query = PostgreSQLAdapter.Query;
Adapter.Parser = Parser;
Adapter.Schema = PostgreSQLAdapter.Schema;

module.exports = Adapter;
