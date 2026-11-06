import {makeAutoObservable, runInAction} from 'mobx';
export async function chatApi(body?: any, session?: string) {
    const response = await fetch('/admin/api/chat' + (session ? `?session=${encodeURIComponent(session)}` : ''), {
        method: body ? 'POST' : 'GET', credentials: 'same-origin',
        headers: {'Content-Type': 'application/json', 'X-CSRF-Token': window.SysConfig.csrfToken},
        ...(body ? {body: JSON.stringify(body)} : {})
    });
    const result = await response.json();
    if (!response.ok || result.errno !== 0) throw new Error(result.errmsg || '请求失败');
    return result.data;
}
export class ChatStore {
    sessions: any[] = [];
    providers: any[] = [];
    session: any = null;
    messages: any[] = [];
    pendingMessage: any = null;
    actions: any[] = [];
    busy = false;
    loading = false;
    streaming = '';
    status = '';
    error = '';
    private generation = 0;
    private abort: AbortController | null = null;
    constructor() { makeAutoObservable(this, {}, {autoBind: true}) }
    async list() {
        const result = await chatApi();
        runInAction(() => { this.sessions = result.sessions; this.providers = result.providers });
    }
    async open(id?: string) {
        const generation = ++this.generation;
        if (!id) { this.session = null; this.messages = []; this.actions = []; this.loading = false; return }
        this.loading = true;
        if (this.session?.id !== id) { this.session = null; this.messages = []; this.actions = [] }
        try {
            const result = await chatApi(undefined, id);
            if (generation !== this.generation) return;
            runInAction(() => {
                this.session = result.session; this.messages = result.messages; this.actions = result.actions;
                this.providers = result.providers;
            });
        } finally {
            if (generation === this.generation) runInAction(() => { this.loading = false });
        }
    }
    async create() { const session = await chatApi({operation: 'create'}); await this.list(); return session.id }
    async manage(id: string, operation: string, values: any = {}) {
        await chatApi({operation, session: id, ...values});
        if (this.session?.id === id && operation === 'delete') {
            runInAction(() => { this.session = null; this.messages = []; this.actions = [] });
        } else if (this.session?.id === id) await this.open(id);
        await this.list();
    }
    async mutate(operation: string, values: any = {}) { return this.manage(this.session.id, operation, values) }
    async stop() {
        if (!this.session) return;
        await chatApi({operation: 'stop', session: this.session.id});
        this.abort?.abort();
    }
    async stream(operation: string, values: any = {}) {
        if (!this.session || this.busy) return;
        const id = this.session.id;
        this.busy = true; this.error = ''; this.streaming = ''; this.status = '正在连接';
        this.abort = new AbortController();
        let completed = false;
        let accepted = false;
        try {
            const response = await fetch('/admin/api/chat', {method: 'POST', credentials: 'same-origin',
                signal: this.abort.signal,
                headers: {'Content-Type': 'application/json', 'X-CSRF-Token': window.SysConfig.csrfToken},
                body: JSON.stringify({operation, session: id, requestKey: crypto.randomUUID(), ...values})});
            if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream')) {
                const result = await response.json(); throw new Error(result.errmsg || '连接失败');
            }
            accepted = true;
            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const {done, value} = await reader.read();
                buffer += decoder.decode(value, {stream: !done});
                let boundary: number;
                while ((boundary = buffer.indexOf('\n\n')) !== -1) {
                    const frame = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
                    const event = frame.match(/^event: (.+)$/m)?.[1];
                    const raw = frame.match(/^data: (.*)$/m)?.[1];
                    if (!raw) continue;
                    const data = JSON.parse(raw);
                    runInAction(() => {
                        if (event === 'delta') this.streaming += data;
                        if (event === 'status') this.status = data;
                        if (event === 'action') {
                            const index = this.actions.findIndex(action => action.id === data.id);
                            if (index === -1) this.actions.push(data); else this.actions[index] = data;
                        }
                        if (event === 'message') {
                            if (!this.messages.some(message => message.id === data.id)) this.messages.push(data);
                            if (data.role === 'user') this.pendingMessage = null;
                            this.streaming = '';
                            if (data.role === 'tool') {
                                const action = this.actions.find(item => item.payload.callId === data.toolCallId);
                                if (action) {
                                    try {
                                        const result = JSON.parse(data.content);
                                        action.status = result.error ? 'failed' : result.cancelled ? 'cancelled' : 'completed';
                                    } catch { /* Final persistence refresh remains authoritative. */ }
                                }
                            }
                        }
                        if (event === 'error') this.error = data;
                        if (event === 'done') completed = true;
                    });
                }
                if (done) break;
            }
            if (!completed) throw new Error('连接已中断，请查看对话与操作记录');
        } catch (error: any) {
            runInAction(() => { this.error = error.name === 'AbortError' ? '已停止。正在同步操作结果。' : error.message });
        } finally {
            runInAction(() => { this.busy = false; this.streaming = ''; this.status = ''; this.abort = null });
            try { await Promise.all([this.list(), this.open(id)]); }
            catch { runInAction(() => { this.error = this.error || '消息状态同步失败，请刷新对话查看已保存的记录'; }); }
            finally { runInAction(() => { this.pendingMessage = null }); }
        }
        return accepted;
    }
}
