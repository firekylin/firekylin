import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import axios from 'axios';
import {MemoryRouter} from '../../../utils/router';
import AIAuditLogs from './ai-logs';
vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
afterEach(() => {cleanup(); vi.clearAllMocks()});
beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {observe() {} unobserve() {} disconnect() {}});
    window.SysConfig = {pluginAdmin: [], config: {}, csrfToken: 'csrf-test', userInfo: {id: 1, name: 'Admin', type: 1}} as any;
    vi.mocked(axios.get).mockImplementation(async(_url, config) => ({data: {errno: 0, data: (config?.params as {id?: number})?.id ?
        {id: 1, started_at: 1, actor_name: 'Admin', status: 'success', content_recorded: 0, request_text: null, response_text: null} :
        {rows: [{id: 1, started_at: 1, actor_name: 'Admin', scenario: 'editor.title', status: 'success', input_tokens: null, output_tokens: 0, total_tokens: null}],
            total: 1, summary: {calls: 1, successes: 1, unknown_usage: 1}, settings: {recordContent: false}}}}));
    vi.mocked(axios.post).mockResolvedValue({data: {errno: 0, data: {deleted: 1}}});
});
it('shows unknown tokens and recording state, sends filters and saves recording with CSRF', async() => {
    render(<MemoryRouter><AIAuditLogs /></MemoryRouter>);
    const toggle = await screen.findByRole('switch', {name: '记录请求与返回文本'});
    await waitFor(() => expect(toggle).not.toBeDisabled());
    expect(toggle).not.toBeChecked();
    expect(screen.getByText(/用量不完整 1 次/)).toBeInTheDocument();
    expect(screen.getAllByText('未知').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole('textbox', {name: '供应商'}), {target: {value: 'deepseek'}});
    fireEvent.click(screen.getByRole('button', {name: /筛\s*选/}));
    await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith('/admin/api/ai-logs', expect.objectContaining({params: {provider: 'deepseek', page: 1}})));
    await waitFor(() => expect(toggle).not.toBeDisabled());
    fireEvent.click(toggle);
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/admin/api/ai-logs', {action: 'settings', recordContent: true},
        {headers: {'X-CSRF-Token': 'csrf-test'}}));
});
it('loads text only on detail and distinguishes recording disabled', async() => {
    render(<MemoryRouter><AIAuditLogs /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', {name: /查\s*看/}));
    await waitFor(() => expect(screen.getAllByText('未开启记录')).toHaveLength(2));
    expect(axios.get).toHaveBeenCalledWith('/admin/api/ai-logs', expect.objectContaining({params: {id: 1}}));
});
it('manual cleanup asks for confirmation before sending deletion', async() => {
    render(<MemoryRouter><AIAuditLogs /></MemoryRouter>);
    await screen.findByRole('button', {name: /查\s*看/});
    fireEvent.click(screen.getByRole('checkbox', {name: /Select all/}));
    fireEvent.click(screen.getByRole('button', {name: '清理选中日志'}));
    expect(axios.post).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', {name: /永久删除/}));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/admin/api/ai-logs', {action: 'cleanup', ids: [1]},
        {headers: {'X-CSRF-Token': 'csrf-test'}}));
});
