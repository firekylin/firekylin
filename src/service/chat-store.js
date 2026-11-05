'use strict';
const {randomUUID} = require('node:crypto');

class ChatStore {
  constructor(getModel) { this.model = getModel }
  async session(id, user) {
    const row = await this.model('chat_session').where({id, user_id: user.id}).find();
    if (!row?.id) throw new Error('对话不存在或无权访问');
    return row;
  }
  async list(user) {
    return this.model('chat_session').where({user_id: user.id}).order('updated_at DESC')
      .select();
  }
  async create(user, selection) {
    const row = {id: randomUUID(), user_id: user.id, title: '新对话', ...selection,
      active_run: '', updated_at: Date.now()};
    await this.model('chat_session').add(row);
    return row;
  }
  async update(id, values) { return this.model('chat_session').where({id}).update({...values, updated_at: Date.now()}) }
  async messages(id) {
    const rows = await this.model('chat_message').where({session_id: id}).order('created_at ASC,id ASC')
      .select();
    return rows.map(row => ({...JSON.parse(row.payload), id: row.id}));
  }
  async append(session, message) {
    const id = randomUUID();
    const last = await this.model('chat_message').where({session_id: session}).order('created_at DESC')
      .find();
    const timestamp = Math.max(Date.now() * 1000, Number(last?.created_at || 0) + 1);
    await this.model('chat_message').add({id, session_id: session, created_at: timestamp,
      payload: JSON.stringify(message)});
    return {...message, id};
  }
  async remove(id) {
    for (const name of ['chat_message', 'chat_action', 'chat_run']) {
      await this.model(name).where({session_id: id}).delete();
    }
    await this.model('chat_session').where({id}).delete();
  }
  async withIdle(session, operation) {
    const lock = randomUUID();
    const claimed = await this.model('chat_session').where({id: session.id, active_run: ''})
      .update({active_run: lock, updated_at: Date.now()});
    if (!claimed) throw new Error('对话正在运行，请稍后重试');
    try { return await operation() } finally { await this.release(session.id, lock) }
  }
  async claim(session, key) {
    if (typeof key !== 'string' || !/^[\w-]{1,100}$/.test(key)) throw new Error('无效的请求标识');
    const existing = await this.model('chat_run').where({session_id: session.id, request_key: key}).find();
    if (existing?.id) throw new Error('请求已接收，请刷新对话查看结果');
    const id = randomUUID();
    const claimed = await this.model('chat_session').where({id: session.id, active_run: ''})
      .update({active_run: id, updated_at: Date.now()});
    if (!claimed) throw new Error('对话正在运行，请等待或停止');
    try {
      await this.model('chat_run').add({id, session_id: session.id, status: 'running',
        expires_at: Date.now() + 150000, created_at: Date.now(), request_key: key});
    } catch (error) {
      await this.release(session.id, id);
      throw error;
    }
    return id;
  }
  async release(session, run) {
    await this.model('chat_session').where({id: session, active_run: run})
      .update({active_run: '', updated_at: Date.now()});
  }
  async finish(session, run, status) {
    await this.model('chat_run').where({id: run}).update({status});
    await this.release(session, run);
  }
  async recover(session) {
    if (!session.active_run) return;
    const run = await this.model('chat_run').where({id: session.active_run}).find();
    if (run?.id && Number(run.expires_at) > Date.now()) return;
    if (!run?.id && Number(session.updated_at) + 150000 > Date.now()) return;
    await this.model('chat_action').where({run_id: session.active_run, status: ['IN', ['ready', 'executing']]})
      .update({status: 'interrupted'});
    await this.append(session.id, {role: 'event', content: '上次运行已中断。写操作不会自动重试，请查看操作记录并核对博客实际状态。'});
    await this.finish(session.id, session.active_run, 'interrupted');
    session.active_run = '';
  }
  async reconcile(session) {
    const messages = await this.messages(session);
    const actions = await this.actions(session);
    const answered = new Set(messages.filter(message => message.role === 'tool').map(message => message.toolCallId));
    for (const message of messages) for (const call of message.toolCalls || []) {
      if (answered.has(call.id)) continue;
      const action = actions.find(item => item.payload.callId === call.id);
      if (action?.status === 'pending') continue;
      await this.append(session, {role: 'tool', toolCallId: call.id, name: call.name,
        content: JSON.stringify(action?.status === 'completed' ? action.payload.result :
          {error: '上次工具调用未完成或结果不确定，禁止自动重试写操作。请核对博客实际状态。'})});
    }
  }
  async actions(session) {
    const rows = await this.model('chat_action').where({session_id: session}).select();
    return rows.map(row => ({...row, payload: JSON.parse(row.payload)}));
  }
}
module.exports = ChatStore;
