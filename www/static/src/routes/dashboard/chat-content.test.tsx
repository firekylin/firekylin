import {cleanup, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {ChatMessage, ExecutionChain, Markdown, ToolResult} from './chat-content';
import {MemoryRouter} from '../../utils/router';
beforeEach(() => { vi.stubGlobal('ResizeObserver', class {observe() {} unobserve() {} disconnect() {}}) });
afterEach(() => {cleanup(); vi.unstubAllGlobals()});
it('Markdown escapes raw HTML, strips unsafe links and does not load remote images', async() => {
    const {container} = render(<Markdown text={'<script>alert(1)</script>\n\n[危险](javascript:alert(1))\n\n![示例](https://example.com/private.png)'} />);
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(container.querySelector('script, img, iframe')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(screen.getByText('示例')).toBeInTheDocument();
});
it('renders fenced code with Ant Design X highlighter without executing it', async() => {
    // Load the real lazy dependency before starting Testing Library's render deadline.
    await import('@ant-design/x/es/code-highlighter');
    const {container} = render(<Markdown text={'```javascript\nconst answer = 42;\n```'} />);
    expect(await screen.findByText('javascript')).toBeInTheDocument();
    await waitFor(() => expect(container.querySelector('code .token')?.textContent).toBe('const'));
    expect(container.querySelector('code')?.textContent).toContain('const answer = 42;');
    expect(container.querySelector('script')).toBeNull();
});
it('tool call proposals are not represented as completed work', () => {
    render(<ExecutionChain entry={{toolCalls: [{id: 'call', name: 'posts.publish', input: {id: 1}}]}}
        actions={[]} messages={[]} running={false} />);
    expect(screen.getByText('未收到执行结果')).toBeInTheDocument();
    expect(screen.queryByText('已完成')).not.toBeInTheDocument();
});
it('execution chain derives failure and cancellation from actual tool messages', () => {
    render(<ExecutionChain entry={{toolCalls: [
        {id: 'failed', name: 'posts.publish', input: {id: 1}}, {id: 'cancel', name: 'posts.delete', input: {id: 2}}
    ]}} actions={[]} running={false} messages={[
        {role: 'tool', toolCallId: 'failed', content: '{"error":"Permission denied"}'},
        {role: 'tool', toolCallId: 'cancel', content: '{"cancelled":true}'}
    ]} />);
    expect(screen.getByText('未完成')).toBeInTheDocument();
    expect(screen.getByText('已取消')).toBeInTheDocument();
    expect(screen.queryByText('已完成')).not.toBeInTheDocument();
});
it('tool result shows related blog sources from returned records only', () => {
    render(<MemoryRouter><ToolResult entry={{name: 'posts.get_managed', content: JSON.stringify({id: 3, title: '真实返回的文章',
        summary: '摘要', status: 3, url: '/post/example.html'})}} preview={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText('相关博客资料')).toBeInTheDocument();
    expect(screen.getAllByText('真实返回的文章').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', {name: '修改内容'})).toHaveAttribute('href', '/post/edit/3');
});
it('model switch notices use a system bubble, not an assistant reply', () => {
    const {container} = render(<ChatMessage entry={{role: 'event', content: '模型已切换'}} />);
    expect(screen.getByText('模型已切换')).toBeInTheDocument();
    expect(container.querySelector('.ant-bubble-system')).toBeInTheDocument();
});
it('keeps every returned article visible instead of silently truncating at twenty', () => {
    const rows = Array.from({length: 21}, (_, i) => ({id: i + 1, title: `文章 ${i + 1}`}));
    render(<MemoryRouter><ToolResult entry={{name: 'posts.list_managed', content: JSON.stringify({data: rows})}} preview={vi.fn()} /></MemoryRouter>);
    expect(screen.getAllByRole('link', {name: '修改内容'})).toHaveLength(21);
    expect(screen.getAllByText('文章 21').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', {name: /预\s*览/})).toHaveLength(21);
});
