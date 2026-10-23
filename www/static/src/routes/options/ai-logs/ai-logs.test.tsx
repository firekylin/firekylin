import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import axios from 'axios';
import {MemoryRouter} from '../../../utils/router';
import AIAuditLogs, {tokenRate} from './ai-logs';
vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
afterEach(() => {cleanup(); vi.clearAllMocks(); vi.useRealTimers()});
beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {observe() {} unobserve() {} disconnect() {}});
    vi.setSystemTime(new Date('2026-10-24T12:00:00Z'));
    window.SysConfig = {pluginAdmin: [], config: {}, csrfToken: 'csrf-test', userInfo: {id: 1, name: 'Admin', type: 1}} as any;
    vi.mocked(axios.get).mockImplementation(async(_url, config) => ({data: {errno: 0, data: (config?.params as {id?: number})?.id ?
        {id: 1, started_at: 1, actor_name: 'Admin', scenario: 'editor.title', status: 'success', content_recorded: 1,
            provider: 'openai', model: 'small', duration_ms: 2000, total_tokens: 123,
            request_text: 'article', response_text: 'title', request_context: JSON.stringify({url: '/admin/api/ai-editor',
                method: 'POST', source: 'admin', parameters: {content: '<script>unsafe</script>'}})} :
        {rows: [{id: 1, started_at: 1, actor_name: 'Admin', scenario: 'editor.title', status: 'success',
            provider: 'openai', model: 'small', input_tokens: 100, output_tokens: 23, total_tokens: 123, duration_ms: 2000}],
            actors: [{id: 1, name: 'Admin'}, {id: 2, name: 'Writer', display_name: '作者小明'}],
            providers: [{id: 'openai', label: 'OpenAI', logo: '/logo.png', models: [{id: 'small', label: 'Small Model'}]}],
            total: 1, summary: {calls: 1, successes: 1, unknown_usage: 0, average_duration_ms: 2000, success_rate: 100}}}}));
    vi.mocked(axios.post).mockResolvedValue({data: {errno: 0, data: {deleted: 1}}});
});
const mount = () => render(<MemoryRouter><AIAuditLogs /></MemoryRouter>);
it('shows provider identity, colored status, total tokens and throughput without recording settings', async() => {
    mount();
    await screen.findByRole('button', {name: /查\s*看/});
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByText('日志记录设置')).toBeNull();
    expect(screen.queryByRole('columnheader', {name: '输入 Token'})).toBeNull();
    expect(screen.queryByRole('columnheader', {name: '输出 Token'})).toBeNull();
    expect(screen.getByRole('columnheader', {name: '总 Token'})).toBeInTheDocument();
    expect(screen.getByText('61.50 /s')).toBeInTheDocument();
    expect(screen.getAllByText('OpenAI').length).toBeGreaterThan(1);
    expect(screen.getByText('Small Model')).toBeInTheDocument();
    expect(document.querySelector('img[src="/logo.png"]')).not.toBeNull();
    expect(document.querySelector('.ant-badge-status-success')).not.toBeNull();
    expect(screen.getByRole('button', {name: '清理选中日志'})).toBeDisabled();
});
it('uses Ant Design date range and searchable actor selection', async() => {
    mount();
    await screen.findByRole('button', {name: /查\s*看/});
    expect(document.querySelector('input[type="date"]')).toBeNull();
    fireEvent.mouseDown(screen.getByRole('combobox', {name: '调用人'}));
    fireEvent.click(await screen.findByText('作者小明'));
    fireEvent.click(screen.getByRole('button', {name: /筛\s*选/}));
    await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith('/admin/api/ai-logs', expect.objectContaining({params: {actor_id: '2', page: 1}})));
    fireEvent.click(screen.getByPlaceholderText('开始日期'));
    fireEvent.focus(screen.getByPlaceholderText('开始日期'));
    await waitFor(() => expect(document.querySelector('.ant-picker-panel')).not.toBeNull());
    const start = document.querySelector('[title="2026-10-01"] .ant-picker-cell-inner');
    expect(start).not.toBeNull();
    fireEvent.click(start!);
    const end = document.querySelector('[title="2026-10-02"] .ant-picker-cell-inner');
    fireEvent.click(end!);
    fireEvent.click(screen.getByRole('button', {name: /筛\s*选/}));
    await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith('/admin/api/ai-logs', expect.objectContaining({params:
        expect.objectContaining({actor_id: '2', from: expect.stringContaining('T'), to: expect.stringContaining('T')})})));
});
it('groups details into six sections and escapes JSON context for syntax highlighting', async() => {
    mount();
    fireEvent.click(await screen.findByRole('button', {name: /查\s*看/}));
    const dialog = await screen.findByRole('dialog');
    for (const section of ['基础信息', '模型信息', 'Token 使用情况', '请求文本', '返回文本', '请求上下文']) {
        expect(await within(dialog).findByRole('heading', {name: section})).toBeInTheDocument();
    }
    expect(within(dialog).queryByText('错误信息')).toBeNull();
    expect(within(dialog).getByText('article')).toBeInTheDocument();
    expect(within(dialog).getByText('title')).toBeInTheDocument();
    expect(dialog.querySelector('code')?.textContent).toContain('<script>unsafe</script>');
    expect(dialog.querySelector('script')).toBeNull();
    expect(dialog.querySelector('.hljs-attr')).not.toBeNull();
    expect(axios.get).toHaveBeenCalledWith('/admin/api/ai-logs', expect.objectContaining({params: {id: 1}}));
});
it('manual cleanup requires confirmation', async() => {
    mount();
    await screen.findByRole('button', {name: /查\s*看/});
    fireEvent.click(screen.getByRole('checkbox', {name: /Select all/}));
    fireEvent.click(screen.getByRole('button', {name: '清理选中日志'}));
    expect(axios.post).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', {name: /永久删除/}));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/admin/api/ai-logs', {action: 'cleanup', ids: [1]},
        {headers: {'X-CSRF-Token': 'csrf-test'}}));
});
it('clears the applied filter across pages, ignoring unapplied edits', async() => {
    mount();
    await screen.findByRole('button', {name: /查\s*看/});
    fireEvent.change(screen.getByRole('textbox', {name: '供应商'}), {target: {value: 'deepseek'}});
    fireEvent.click(screen.getByRole('button', {name: /筛\s*选/}));
    await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith('/admin/api/ai-logs', expect.objectContaining({params: {provider: 'deepseek', page: 1}})));
    const clearAll = screen.getByRole('button', {name: '清理当前所有日志'});
    await waitFor(() => expect(clearAll).not.toBeDisabled());
    fireEvent.change(screen.getByRole('textbox', {name: '供应商'}), {target: {value: 'openai'}});
    fireEvent.click(clearAll);
    expect(axios.post).not.toHaveBeenCalled();
    expect(await screen.findByText(/包含所有分页/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: /永久删除/}));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/admin/api/ai-logs',
        {action: 'cleanup', scope: 'filtered', filters: {provider: 'deepseek'}}, {headers: {'X-CSRF-Token': 'csrf-test'}}));
});
it('keeps unknown and zero throughput distinct and never divides by zero', () => {
    expect(tokenRate({id: 1, total_tokens: 0, duration_ms: 1000})).toBe('0.00 /s');
    expect(tokenRate({id: 1, total_tokens: null, duration_ms: 1000})).toBe('未知');
    expect(tokenRate({id: 1, total_tokens: 5, duration_ms: 0})).toBe('未知');
});
