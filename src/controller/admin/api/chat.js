'use strict';
const Base = require('./base');
const ChatStore = require('../../../service/chat-store');
const {ChatAgent} = require('../../../service/chat-agent');

const controllers = new Map();
module.exports = class extends Base {
  putAction() { return this.ctx.throw(405, 'Use authenticated chat POST operations') }
  deleteAction() { return this.ctx.throw(405, 'Use authenticated chat POST operations') }
  store() { return new ChatStore(name => this.model(name)) }
  async identity() {
    if (![1, 2].includes(Number(this.userInfo?.type))) return this.ctx.throw(403);
    // Read current role, not a stale role embedded in the login cookie.
    const user = await this.model('user').where({id: this.userInfo.id}).find();
    if (![1, 2].includes(Number(user?.type)) || Number(user.status) === 2) return this.ctx.throw(403);
    return user;
  }
  async getAction() {
    const user = await this.identity();
    const store = this.store();
    const providers = await global.firekylin.plugins.ai.models();
    const id = this.get('session');
    if (!id) return this.success({sessions: await store.list(user), providers});
    const session = await store.session(id, user);
    await store.recover(session);
    const actions = await store.actions(id);
    const agent = new ChatAgent({store, registry: global.firekylin.plugins.abilities,
      ai: global.firekylin.plugins.ai, getModel: name => this.model(name)});
    for (const action of actions.filter(item => item.status === 'interrupted')) {
      try {
        action.payload.observed = await agent.snapshot(action.payload.name, action.payload.input, user);
      } catch {
        action.payload.observed = {status: '无法读取，请在管理页面核对'};
      }
    }
    const messages = (await store.messages(id)).map(message => {
      const visible = {...message};
      delete visible.providerData;
      return visible;
    });
    return this.success({session, messages, actions, providers});
  }
  async postAction() {
    const user = await this.identity();
    const body = this.post() || {};
    const store = this.store();
    if (body.operation === 'create') {
      const providers = await global.firekylin.plugins.ai.models();
      const models = providers.filter(provider => provider.configured !== false)
        .flatMap(provider => provider.models.filter(model => model.capabilities.includes('text'))
          .map(model => ({provider: provider.id, ...model})));
      const selected = models.find(model => model.selected) || models[0];
      return this.success(await store.create(user, {provider: selected?.provider || '', model: selected?.id || ''}));
    }
    const session = await store.session(body.session, user);
    await store.recover(session);
    if (body.operation === 'stop') {
      if (session.active_run) {
        await store.model('chat_run').where({id: session.active_run, status: 'running'}).update({status: 'cancelled'});
        controllers.get(session.active_run)?.abort();
      }
      return this.success();
    }
    if (session.active_run) return this.fail('对话正在运行，请先停止');
    if (body.operation === 'rename') {
      if (typeof body.title !== 'string'
          || !body.title.trim()
          || body.title.length > 100) {
        return this.fail('标题长度应为 1–100 字');
      }
      await store.withIdle(session, () => store.update(session.id, {title: body.title.trim()}));
      return this.success();
    }
    if (body.operation === 'delete') {
      await store.withIdle(session, () => store.remove(session.id));
      return this.success();
    }
    const pending = (await store.actions(session.id)).filter(action => action.status === 'pending');
    if (body.operation === 'select') {
      if (pending.length) return this.fail('请先确认或取消待处理操作');
      const providers = await global.firekylin.plugins.ai.models();
      const provider = providers.find(item => item.id === body.provider && item.configured !== false);
      if (!provider?.models.some(model => model.id === body.model
          && model.capabilities.includes('text'))) {
        return this.fail('模型不可用');
      }
      await store.withIdle(session, async() => {
        await store.update(session.id, {provider: body.provider, model: body.model});
        await store.append(session.id, {role: 'event', content: `模型已切换为 ${provider.label} / ${body.model}`});
      });
      return this.success();
    }
    if (!['send', 'confirm', 'retry'].includes(body.operation)) return this.fail('无效操作');
    if (body.operation !== 'confirm' && pending.length) return this.fail('请先确认或取消待处理操作');
    if (body.operation === 'send'
        && (typeof body.content !== 'string'
        || !body.content.trim()
        || body.content.length > 50000)) {
      return this.fail('请输入 1–50000 字的消息');
    }
    if (body.operation === 'confirm'
        && (typeof body.approve !== 'boolean'
        || !pending.some(action => action.id === body.action))) {
      return this.fail('待确认操作不存在');
    }
    if (body.operation === 'retry') {
      const history = await store.messages(session.id);
      if (history.at(-1)?.role !== 'error') return this.fail('只能重试失败的回复');
      // Never replay an unresolved tool call or an uncertain write.
      if (history.some(message => message.toolCalls?.length)) return this.fail('本对话包含博客操作，请先核对实际状态，再发送新消息');
    }
    const run = await store.claim(session, body.requestKey);
    let userMessage;
    try {
      Object.assign(session, await store.session(session.id, user));
      const waiting = (await store.actions(session.id)).filter(action => action.status === 'pending');
      if (body.operation !== 'confirm' && waiting.length) throw new Error('请先确认或取消待处理操作');
      if (body.operation === 'confirm' && !waiting.some(action => action.id === body.action)) {
        throw new Error('操作已处理');
      }
      await store.reconcile(session.id);
      if (body.operation === 'send') {
        userMessage = await store.append(session.id, {role: 'user', content: body.content.trim()});
        if (session.title === '新对话') await store.update(session.id, {title: body.content.trim().slice(0, 40)});
      }
    } catch (error) {
      await store.finish(session.id, run, 'failed');
      throw error;
    }
    const controller = new AbortController();
    controllers.set(run, controller);
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(120000)]);
    const res = this.ctx.res;
    this.ctx.respond = false;
    res.writeHead(200, {'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no'});
    const emit = (event, data) => { if (!res.destroyed) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`) };
    const close = () => { if (!res.writableEnded) controller.abort() };
    res.once('close', close);
    let checking = false;
    const heartbeat = setInterval(async() => {
      if (checking) return;
      checking = true;
      try {
        const row = await store.model('chat_run').where({id: run}).find();
        if (row.status !== 'running') controller.abort();
        else await store.model('chat_run').where({id: run, status: 'running'})
          .update({expires_at: Date.now() + 150000});
        emit('heartbeat', null);
      } catch { controller.abort() } finally { checking = false }
    }, 2000);
    let status = 'failed';
    try {
      emit('run', {id: run});
      if (userMessage) emit('message', userMessage);
      const agent = new ChatAgent({store, registry: global.firekylin.plugins.abilities,
        ai: global.firekylin.plugins.ai, getModel: name => this.model(name), now: () => think.datetime()});
      status = await agent.run({session, user, run, signal, emit,
        decision: body.operation === 'confirm' ? {id: body.action, approve: body.approve} : undefined});
    } catch {
      status = signal.aborted ? 'cancelled' : 'failed';
      const content = signal.aborted ? '运行已停止。已完成的博客操作不会撤销，请查看操作结果。' : '回复或操作未完成，请检查 AI 连接及操作记录。写操作不会自动重试。';
      await store.append(session.id, {role: 'error', content});
      emit('error', content);
    } finally {
      clearInterval(heartbeat);
      controllers.delete(run);
      res.removeListener('close', close);
      await store.finish(session.id, run, status);
      emit('done', {status});
      res.end();
    }
  }
};
