import React from 'react';
import {render, screen, fireEvent, waitFor, cleanup} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import Chat from './chat';
import {MemoryRouter} from '../../utils/router';
const provider = {id: 'test', label: '测试服务商', models: [{id: 'model', label: '测试模型', selected: true, capabilities: ['text', 'tools']}]};
let sessions: any[];
let messages: any[];
let actions: any[];
let requests: any[];
beforeEach(() => {
    sessions = []; messages = []; actions = []; requests = [];
    vi.stubGlobal('ResizeObserver', class {observe() {} unobserve() {} disconnect() {}});
    window.SysConfig = {csrfToken: 'csrf'} as any;
    vi.stubGlobal('fetch', vi.fn(async(url, options) => {
        const body = options?.body ? JSON.parse(options.body) : null;
        requests.push({url, body});
        let data: any = {sessions, providers: [provider]};
        if (body?.operation === 'create') {sessions = [{id: 'one', title: '新对话', provider: 'test', model: 'model', active_run: '', updated_at: Date.now()}]; data = sessions[0]}
        if (String(url).includes('?session=')) data = {session: sessions[0], messages, actions, providers: [provider]};
        if (body?.operation === 'send') {
            messages = [{id: 'm1', role: 'user', content: body.content}, {id: 'm2', role: 'assistant', content: '**已收到**'}];
            const stream = new ReadableStream({start(controller) {
                controller.enqueue(new TextEncoder().encode('event: done\ndata: {"status":"completed"}\n\n')); controller.close();
            }});
            return {ok: true, headers: new Headers({'content-type': 'text/event-stream'}), body: stream};
        }
        return {ok: true, json: async() => ({errno: 0, data})};
    }));
});
afterEach(() => {cleanup(); vi.unstubAllGlobals()});
it('shows centered entry, sends first message, persists route and renders Markdown', async() => {
    render(<MemoryRouter initialEntries={['/dashboard']}><Chat /></MemoryRouter>);
    expect(screen.getByText('今天想写点什么？')).toBeInTheDocument();
    await screen.findByText('✦ 博客技能已启用');
    fireEvent.change(screen.getByLabelText('聊天消息'), {target: {value: '你好'}});
    fireEvent.click(screen.getByLabelText('发送消息'));
    expect(await screen.findByText('已收到')).toBeInTheDocument();
    expect(requests.find(row => row.body?.operation === 'send').body).toMatchObject({session: 'one', content: '你好'});
    expect(screen.queryByText('今天想写点什么？')).not.toBeInTheDocument();
});
it('restores history and confirmation with both before and after values', async() => {
    sessions = [{id: 'one', title: '修改标题', provider: 'test', model: 'model', active_run: '', updated_at: Date.now()}];
    messages = [{id: 'm', role: 'user', content: '更改标题'}];
    actions = [{id: 'action', status: 'pending', payload: {name: 'settings.update', before: {title: '旧标题'}, input: {settings: {title: '新标题'}}}}];
    render(<MemoryRouter initialEntries={['/dashboard/one']}><Chat /></MemoryRouter>);
    expect(await screen.findByText('等待确认')).toBeInTheDocument();
    expect(screen.getAllByText(/旧标题/).length).toBeGreaterThan(0);
    expect(screen.getByText('新标题', {exact: true})).toBeInTheDocument();
    expect(screen.getByLabelText('聊天消息')).toBeDisabled();
    expect(screen.getByText('确认执行')).toBeEnabled();
});
it('does not submit during Chinese composition', async() => {
    render(<MemoryRouter><Chat /></MemoryRouter>);
    await screen.findByLabelText('聊天消息');
    const input = screen.getByLabelText('聊天消息');
    fireEvent.compositionStart(input);
    fireEvent.change(input, {target: {value: '中文'}});
    fireEvent.keyDown(input, {key: 'Enter'});
    await waitFor(() => expect(requests.filter(row => row.body?.operation === 'send')).toHaveLength(0));
});
it('does not render HTML from model messages', async() => {
    sessions = [{id: 'one', title: '问答', provider: 'test', model: 'model', active_run: '', updated_at: Date.now()}];
    messages = [{id: 'm', role: 'assistant', content: '<img src=x onerror=alert(1)>'}];
    const {container} = render(<MemoryRouter initialEntries={['/dashboard/one']}><Chat /></MemoryRouter>);
    await screen.findByText('<img src=x onerror=alert(1)>');
    expect(container.querySelector('.chat-markdown img')).toBeNull();
});
