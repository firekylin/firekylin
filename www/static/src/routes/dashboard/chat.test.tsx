import React from 'react';
import {render, screen, fireEvent, waitFor, cleanup, within} from '@testing-library/react';
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
it('shows overview chat entry, sends first message, persists route and renders Markdown', async() => {
    render(<MemoryRouter initialEntries={['/dashboard']}><Chat><div>概览下方三栏</div></Chat></MemoryRouter>);
    expect(screen.getByText('今天想写点什么？')).toBeInTheDocument();
    await screen.findByText('博客技能已启用');
    fireEvent.change(screen.getByLabelText('聊天消息'), {target: {value: '你好'}});
    fireEvent.click(screen.getByLabelText('发送消息'));
    expect(await screen.findByText('已收到')).toBeInTheDocument();
    expect(requests.find(row => row.body?.operation === 'send').body).toMatchObject({session: 'one', content: '你好'});
    expect(screen.queryByText('今天想写点什么？')).not.toBeInTheDocument();
    expect(screen.queryByText('概览下方三栏')).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: '收起会话列表'})).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', {name: '收起会话列表'}));
    fireEvent.change(screen.getByLabelText('聊天消息'), {target: {value: '继续聊'}});
    expect(screen.getByRole('button', {name: '展开会话列表'})).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(within(screen.getByRole('main')).getByRole('button', {name: '新建对话'})).toBeEnabled());
    fireEvent.click(within(screen.getByRole('main')).getByRole('button', {name: '新建对话'}));
    expect(await screen.findByText('概览下方三栏')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '展开会话列表'})).toHaveAttribute('aria-expanded', 'false');
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

it('home history starts collapsed and can be expanded and collapsed manually', async() => {
    render(<MemoryRouter initialEntries={['/dashboard']}><Chat><div>下方概要</div></Chat></MemoryRouter>);
    await screen.findByLabelText('聊天消息');
    expect(screen.getByRole('button', {name: '展开会话列表'})).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation', {name: '对话列表'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: '展开会话列表'}));
    expect(screen.getByRole('navigation', {name: '对话列表'})).toBeVisible();
    expect(screen.getByText('下方概要')).toBeVisible();
    fireEvent.click(screen.getByRole('button', {name: '收起会话列表'}));
    expect(screen.queryByRole('navigation', {name: '对话列表'})).not.toBeInTheDocument();
});
it('sending with history already expanded keeps it expanded', async() => {
    render(<MemoryRouter initialEntries={['/dashboard']}><Chat><div>下方概要</div></Chat></MemoryRouter>);
    await screen.findByLabelText('聊天消息');
    fireEvent.click(screen.getByRole('button', {name: '展开会话列表'}));
    fireEvent.change(screen.getByLabelText('聊天消息'), {target: {value: '你好'}});
    fireEvent.click(screen.getByLabelText('发送消息'));
    await screen.findByText('已收到');
    expect(screen.getByRole('button', {name: '收起会话列表'})).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByText('下方概要')).not.toBeInTheDocument();
});
it('restored real conversation uses the full main area and opens history', async() => {
    sessions = [{id: 'one', title: '旧对话', provider: 'test', model: 'model', active_run: '', updated_at: Date.now()}];
    messages = [{id: 'old', role: 'assistant', content: '之前的回复'}];
    render(<MemoryRouter initialEntries={['/dashboard/one']}><Chat><div>下方概要</div></Chat></MemoryRouter>);
    await screen.findByText('之前的回复');
    expect(screen.queryByText('下方概要')).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: '收起会话列表'})).toHaveAttribute('aria-expanded', 'true');
});
it('empty session with only a model selection event remains in overview mode', async() => {
    sessions = [{id: 'one', title: '新对话', provider: 'test', model: 'model', active_run: '', updated_at: Date.now()}];
    messages = [{id: 'event', role: 'event', content: '模型已切换'}];
    render(<MemoryRouter initialEntries={['/dashboard/one']}><Chat><div>下方概要</div></Chat></MemoryRouter>);
    await screen.findByLabelText('聊天消息');
    expect(screen.getByText('今天想写点什么？')).toBeVisible();
    expect(screen.getByText('下方概要')).toBeVisible();
    expect(screen.getByRole('button', {name: '展开会话列表'})).toHaveAttribute('aria-expanded', 'false');
});

it('recommended prompts fill the Sender without submitting automatically', async() => {
    render(<MemoryRouter><Chat /></MemoryRouter>);
    await screen.findByLabelText('聊天消息');
    fireEvent.click(screen.getByText('查找草稿'));
    expect(screen.getByLabelText('聊天消息')).toHaveValue('查找最近的草稿');
    expect(requests.filter(row => row.body?.operation === 'send')).toHaveLength(0);
});
it('conversation menu can rename a selected conversation', async() => {
    sessions = [{id: 'one', title: '旧名称', provider: 'test', model: 'model', active_run: '', updated_at: Date.now()}];
    render(<MemoryRouter><Chat /></MemoryRouter>);
    await screen.findByLabelText('聊天消息');
    fireEvent.click(screen.getByRole('button', {name: '展开会话列表'}));
    fireEvent.click(await screen.findByRole('button', {name: '管理会话：旧名称'}));
    fireEvent.click(await screen.findByText('重命名'));
    fireEvent.change(await screen.findByLabelText('对话标题'), {target: {value: '新名称'}});
    fireEvent.click(await screen.findByRole('button', {name: /保\s*存/}));
    await waitFor(() => expect(requests.some(row => row.body?.operation === 'rename' && row.body?.session === 'one' && row.body?.title === '新名称')).toBe(true));
});
it('slash commands use Suggestion and fill the Sender without sending', async() => {
    render(<MemoryRouter><Chat /></MemoryRouter>);
    await screen.findByLabelText('聊天消息');
    fireEvent.change(screen.getByLabelText('聊天消息'), {target: {value: '/'}});
    await waitFor(() => expect(screen.getAllByText('查找草稿').length).toBeGreaterThan(1));
    const options = screen.getAllByText('查找草稿');
    fireEvent.click(options[options.length - 1]);
    expect(screen.getByLabelText('聊天消息')).toHaveValue('查找最近的草稿');
    expect(requests.filter(row => row.body?.operation === 'send')).toHaveLength(0);
});
