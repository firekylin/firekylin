const PostgreSQL = require('think-model-postgresql');

// Upstream caches schemas globally by table name, including missing tables.
// Keep successful metadata local to the connection/model and retry missing tables.
class Schema extends PostgreSQL.Schema {
  async getSchema(table = this.table) {
    this.schemas = this.schemas || new Map();
    if (this.schemas.has(table)) return this.schemas.get(table);
    const name = this.parser.parseValue(table);
    const columns = await this.query.query(`SELECT column_name,is_nullable,data_type
      FROM information_schema.columns
      WHERE table_name=${name} AND table_schema=current_schema()`);
    if (!columns.length) throw new Error(`Table ${table} does not exist or has no visible columns`);
    const indexes = await this.query.query(`SELECT indexname,indexdef FROM pg_indexes
      WHERE tablename=${name} AND schemaname=current_schema()`);
    const schema = {};
    for (const column of columns) {
      schema[column.column_name] = {
        name: column.column_name, type: column.data_type,
        required: column.is_nullable === 'NO', primary: false, unique: false,
        default: '', autoIncrement: false
      };
    }
    for (const index of indexes) {
      const match = index.indexdef.match(/\((\w+)\)/);
      if (match && /_pkey$/.test(index.indexname) && schema[match[1]]) {
        schema[match[1]].primary = true;
      }
    }
    Object.assign(schema, this.schema);
    for (const key of Object.keys(schema)) schema[key] = this._parseItemSchema(schema[key]);
    this.schemas.set(table, schema);
    return schema;
  }
}

module.exports = class PostgreSQLAdapter extends PostgreSQL {};
module.exports.Schema = Schema;
