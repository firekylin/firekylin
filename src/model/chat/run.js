module.exports = class extends think.Model {
  get tableName() { return this.tablePrefix + 'chat_run' }
};
