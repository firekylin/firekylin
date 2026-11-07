import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import axios from 'axios';
import {message} from 'antd';
import {MemoryRouter} from '../../../utils/router';
import SmartContentSettings from './smart-content';
vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
afterEach(async() => {
    // Static Ant Design messages own a React root outside Testing Library.
    await act(async() => { cleanup(); message.destroy() });
    // Ant Design Form's error-list debounce leaves 10 ms updates pending after
    // unmount (useDelayState has no cleanup). Drain them before jsdom tears down.
    await act(async() => { await new Promise(resolve => setTimeout(resolve, 20)) });
});
beforeEach(() => {
    globalThis.ResizeObserver = class {observe() {} unobserve() {} disconnect() {}} as any;
    vi.spyOn(message, 'success').mockImplementation(() => (() => {}) as any);
    window.SysConfig = {pluginAdmin: [], config: {}, csrfToken: 'token', userInfo: {id: 1, name: 'Admin', type: 1}} as any;
    vi.mocked(axios.get).mockResolvedValue({data: {errno: 0, data: {features: {
        summary: true, title: false, rewrite: true, translate: true, slug: false, category: false, autocomplete: false,
    }}}});
    vi.mocked(axios.post).mockResolvedValue({data: {errno: 0, data: {features: {title: true}}}});
});
it('shows all described switches without a plugin or language setting and saves to core', async() => {
    render(<MemoryRouter initialEntries={['/options/smart-content']}><SmartContentSettings /></MemoryRouter>);
    const title = await screen.findByRole('switch', {name: '生成标题'});
    await waitFor(() => expect(title).not.toBeDisabled());
    for (const name of ['图片生成和编辑', '评论审核', '建议回复', '生成摘要', '生成标题', '智能审阅', '翻译文章', '生成 Slug', '智能分类', '内容自动建议']) {
        expect(screen.getByRole('switch', {name})).toBeInTheDocument();
    }
    expect(title).not.toBeChecked();
    expect(screen.getByText(/正文超过 250 个字时，生成标题建议/)).toBeInTheDocument();
    expect(screen.getAllByRole('combobox')).toHaveLength(3);
    expect(screen.queryByRole('combobox', {name: '生成标题使用的模型'})).toBeNull();
    fireEvent.click(title);
    fireEvent.click(screen.getByRole('button', {name: /保\s*存/}));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/admin/api/smart-content',
        {features: expect.objectContaining({title: true}), models: {}}, {headers: {'X-CSRF-Token': 'token'}}));
    await waitFor(() => expect(title).not.toBeDisabled());
});
it('loads per-capability models, filters incompatible and unconfigured providers, and saves bindings', async() => {
    vi.mocked(axios.get).mockResolvedValue({data: {errno: 0, data: {features: {title: true, image: true},
        models: {title: {provider: 'deepseek', model: 'chat'}}, providers: [
            {id: 'deepseek', label: 'DeepSeek', configured: true, models: [{id: 'chat', label: 'Chat', capabilities: ['text']}]},
            {id: 'openai', label: 'OpenAI', configured: true, models: [{id: 'draw', label: 'Draw', capabilities: ['image']}]},
            {id: 'disabled', label: 'Disabled', configured: false, models: [{id: 'draw', label: 'Hidden', capabilities: ['image']}]}
        ]}}});
    render(<MemoryRouter initialEntries={['/options/smart-content']}><SmartContentSettings /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('switch', {name: '生成标题'})).not.toBeDisabled());
    fireEvent.mouseDown(screen.getByRole('combobox', {name: '图片生成和编辑使用的模型'}));
    expect(screen.queryByText('Disabled / Hidden')).toBeNull();
    expect(screen.queryByText('DeepSeek / Chat', {selector: '.ant-select-item-option-content'})).toBeNull();
    fireEvent.click(screen.getByText('OpenAI / Draw', {selector: '.ant-select-item-option-content'}));
    fireEvent.click(screen.getByRole('button', {name: /保\s*存/}));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/admin/api/smart-content',
        {features: expect.objectContaining({title: true, image: true}), models: {
            title: {provider: 'deepseek', model: 'chat'}, image: {provider: 'openai', model: 'draw'}
        }}, {headers: {'X-CSRF-Token': 'token'}}));
});
it('keeps stale model bindings visible and requires an explicit replacement', async() => {
    vi.mocked(axios.get).mockResolvedValue({data: {errno: 0, data: {features: {title: true},
        models: {title: {provider: 'removed', model: 'old'}}, providers: []}}});
    render(<MemoryRouter initialEntries={['/options/smart-content']}><SmartContentSettings /></MemoryRouter>);
    await screen.findByText('removed / old（不可用，请重新选择）');
    fireEvent.click(screen.getByRole('button', {name: /保\s*存/}));
    await screen.findByText('请选择可用模型或恢复默认');
    expect(axios.post).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole('combobox', {name: '生成标题使用的模型'}));
    fireEvent.click(screen.getByText('使用全局默认模型', {selector: '.ant-select-item-option-content'}));
    fireEvent.click(screen.getByRole('button', {name: /保\s*存/}));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/admin/api/smart-content',
        {features: expect.objectContaining({title: true}), models: {}}, expect.anything()));
});
it('hides disabled model pickers without losing saved bindings and restores them on enabling', async() => {
    vi.mocked(axios.get).mockResolvedValue({data: {errno: 0, data: {features: {title: false},
        models: {title: {provider: 'removed', model: 'old'}}, providers: []}}});
    render(<MemoryRouter initialEntries={['/options/smart-content']}><SmartContentSettings /></MemoryRouter>);
    const toggle = screen.getByRole('switch', {name: '生成标题'});
    await waitFor(() => expect(toggle).not.toBeDisabled());
    expect(screen.queryByRole('combobox', {name: '生成标题使用的模型'})).toBeNull();
    fireEvent.click(toggle);
    expect(await screen.findByRole('combobox', {name: '生成标题使用的模型'})).toBeInTheDocument();
    expect(screen.getByText('removed / old（不可用，请重新选择）')).toBeVisible();
    fireEvent.click(screen.getByRole('switch', {name: '生成标题'}));
    await waitFor(() => expect(screen.getByRole('switch', {name: '生成标题'})).not.toBeChecked());
    fireEvent.click(screen.getByRole('button', {name: /保\s*存/}));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/admin/api/smart-content',
        {features: expect.objectContaining({title: false}), models: {title: {provider: 'removed', model: 'old'}}}, expect.anything()));
});
