'use strict';
const {randomUUID} = require('node:crypto');

module.exports = class extends think.Model {
  get tableName() { return this.tablePrefix + 'chat_message' }
  async listForSession(id) {
    const rows = await this.where({session_id: id}).order('created_at ASC,id ASC')
      .select();
    return rows.map(row => ({...JSON.parse(row.payload), id: row.id}));
  }
  async append(session, message) {
    const id = randomUUID();
    const last = await this.where({session_id: session}).order('created_at DESC')
      .find();
    const timestamp = Math.max(Date.now() * 1000, Number(last?.created_at || 0) + 1);
    await this.add({id, session_id: session, created_at: timestamp,
      payload: JSON.stringify(message)});
    return {...message, id};
  }
};
