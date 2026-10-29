const SQLite = require('think-model-sqlite');

class Schema extends SQLite.Schema {
  async getSchema(table = this.table) {
    this.schemas = this.schemas || new Map();
    if (this.schemas.has(table)) return this.schemas.get(table);
    const fields = await this.query.query(`PRAGMA table_info(${this.parser.parseKey(table)})`);
    if (!fields.length) throw new Error(`Table ${table} does not exist or has no visible columns`);
    const schema = {};
    for (const field of fields) {
      schema[field.name] = {
        name: field.name, type: field.type, required: !!field.notnull,
        default: '', primary: !!field.pk, unique: false, autoIncrement: false
      };
    }
    Object.assign(schema, this.schema);
    for (const key of Object.keys(schema)) schema[key] = this._parseItemSchema(schema[key]);
    this.schemas.set(table, schema);
    return schema;
  }
}

module.exports = class SQLiteAdapter extends SQLite {};
module.exports.Schema = Schema;
