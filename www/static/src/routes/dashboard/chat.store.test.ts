import {afterEach, expect, it, vi} from 'vitest';
import {ChatStore} from './chat.store';
afterEach(() => vi.unstubAllGlobals());
it('live tool proposals stay pending until an actual error result arrives', async() => {
    window.SysConfig = {csrfToken: 'csrf'} as any;
    const store = new ChatStore();
    store.session = {id: 'one', active_run: ''};
    let controller: ReadableStreamDefaultController<Uint8Array>;
    const action = {id: 'action', status: 'pending', payload: {callId: 'call', name: 'posts.publish', input: {id: 3}}};
    const persisted = {...action, status: 'failed'};
    const errorMessage = {id: 'tool', role: 'tool', toolCallId: 'call', content: '{"error":"权限不足"}'};
    vi.stubGlobal('fetch', vi.fn(async(url, options) => options?.method === 'POST' ? {
        ok: true, headers: new Headers({'content-type': 'text/event-stream'}),
        body: new ReadableStream<Uint8Array>({start(value) {controller = value}})
    } : {ok: true, json: async() => ({errno: 0, data: String(url).includes('?session=')
        ? {session: {id: 'one', active_run: ''}, messages: [errorMessage], actions: [persisted], providers: []}
        : {sessions: [], providers: []}})}));
    const running = store.stream('send', {content: '发布文章'});
    await vi.waitFor(() => expect(controller!).toBeDefined());
    const emit = (event: string, data: any) => controller!.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    emit('action', action);
    emit('message', {id: 'assistant', role: 'assistant', toolCalls: [{id: 'call', name: 'posts.publish', input: {id: 3}}]});
    await vi.waitFor(() => expect(store.actions[0]?.status).toBe('pending'));
    emit('message', errorMessage);
    await vi.waitFor(() => expect(store.actions[0]?.status).toBe('failed'));
    emit('done', {status: 'completed'});
    controller!.close();
    await running;
    expect(store.actions[0].status).toBe('failed');
    expect(store.busy).toBe(false);
});
it('deleting the current conversation does not try to reopen a deleted session', async() => {
    window.SysConfig = {csrfToken: 'csrf'} as any;
    const store = new ChatStore();
    store.session = {id: 'one'}; store.messages = [{role: 'user', content: 'hello'}];
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async(url, options) => {
        calls.push(String(url));
        return {ok: true, json: async() => ({errno: 0, data: options?.method === 'POST' ? {} : {sessions: [], providers: []}})};
    }));
    await store.manage('one', 'delete');
    expect(store.session).toBeNull();
    expect(store.messages).toHaveLength(0);
    expect(calls.some(url => url.includes('?session='))).toBe(false);
});
it('keeps persistence acknowledgement when the stream or history refresh fails', async() => {
    window.SysConfig = {csrfToken: 'csrf'} as any;
    const store = new ChatStore();
    store.session = {id: 'one'};
    vi.stubGlobal('fetch', vi.fn(async(_, options) => {
        if (options?.method !== 'POST') throw new Error('offline');
        return {ok: true, headers: new Headers({'content-type': 'text/event-stream'}),
            body: new ReadableStream({start(controller) {controller.error(new Error('disconnected'))}})};
    }));
    expect(await store.stream('send', {content: '', attachments: [{name: 'a.txt', content: 'text'}]})).toBe(true);
    expect(store.error).toBe('disconnected');
});
