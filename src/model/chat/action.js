'use strict';
module.exports = class extends think.Model {
  get tableName() { return this.tablePrefix + 'chat_action' }
  async listForSession(session) {
    const rows = await this.where({session_id: session}).select();
    return rows.map(row => ({...row, payload: JSON.parse(row.payload)}));
  }
};
