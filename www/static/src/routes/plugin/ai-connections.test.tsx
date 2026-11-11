import {cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
import {ConfigProvider, message} from 'antd';
import {of, Subject} from 'rxjs';
import {MemoryRouter} from '../../utils/router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import AIConnections from './ai-connections';
import {http} from '../../utils/http';
import {InitiateRoutes, InitiateThemePages} from '../../components/data/routes.data';

vi.mock('../../utils/http', () => ({
    http: {get: vi.fn(), post: vi.fn()}
}));

describe('AI connections', () => {
    afterEach(() => cleanup());
    it('appears under system settings', () => {
        const options = InitiateRoutes(InitiateThemePages).find(item => item.url === '/options');
        expect(options?.children?.some(item => item.url === '/options/ai')).toBe(true);
    });

    beforeEach(() => {
        vi.spyOn(message, 'success').mockImplementation(() => (() => {}) as any);
        globalThis.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        } as any;
        window.SysConfig = {pluginAdmin: [], csrfToken: 'test-csrf', config: {},
            userInfo: {id: 1, name: 'Admin', type: 1}} as unknown as typeof window.SysConfig;
        vi.mocked(http.get).mockReturnValue(of({errno: 0, data: {providers: [{
            id: 'deepseek', label: 'DeepSeek', configured: false,
            models: [{id: 'deepseek-flash', label: 'DeepSeek Flash', selected: false}]
        }]}} as any));
        vi.mocked(http.post).mockReturnValue(of({errno: 0, data: {message: 'AI 连接已禁用。'}} as any));
    });

    it('does not allow an unconfigured provider to become default before saving credentials', async() => {
        const view = render(<MemoryRouter initialEntries={['/options/ai']}><AIConnections /></MemoryRouter>);
        expect(view.getByText('系统设置')).toBeInTheDocument();
        expect(view.container.querySelector('h3.page-title')).toHaveTextContent('AI 连接');
        await waitFor(() => expect(view.getByText('尚未配置 AI 连接，请点击“增加服务商”。')).toBeInTheDocument());
        expect(view.queryByText('未配置')).not.toBeInTheDocument();
        expect(view.queryByRole('button', {name: '保存'})).toBeNull();
        fireEvent.click(view.getByRole('button', {name: '增加服务商'}));
        fireEvent.click(view.getByRole('menuitem', {name: 'DeepSeek'}));
        expect(view.getByRole('button', {name: '将DeepSeek设为默认模型'})).toBeDisabled();
        expect(view.queryByRole('button', {name: '设为默认模型'})).toBeNull();
        expect(http.post).not.toHaveBeenCalled();
    });

    it('keeps the saved model selected after provider data refreshes', async() => {
        const refreshed = new Subject<any>();
        const provider = (selectedModel: string) => ({errno: 0, data: {providers: [{
            id: 'deepseek', label: 'DeepSeek',
            models: [
                {id: 'model-one', label: 'Model One', selected: selectedModel === 'model-one'},
                {id: 'model-two', label: 'Model Two', selected: selectedModel === 'model-two'}
            ]
        }]}});
        vi.mocked(http.get).mockReturnValueOnce(of(provider('model-one')) as any)
            .mockReturnValueOnce(refreshed as any);
        const view = render(<MemoryRouter initialEntries={['/options/ai']}><AIConnections /></MemoryRouter>);
        await waitFor(() => expect(view.getByRole('combobox', {name: '选择 AI 模型'})).toBeInTheDocument());
        fireEvent.mouseDown(view.getByRole('combobox', {name: '选择 AI 模型'}));
        fireEvent.click(view.getByText('Model Two'));
        fireEvent.click(view.getByRole('button', {name: '保存'}));
        await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
        refreshed.next(provider('model-two'));
        await waitFor(() => expect(view.getByRole('button', {name: '保存'})).toBeDisabled());
        const modelSelect = view.getByRole('combobox', {name: '选择 AI 模型'}).closest('.ant-select');
        expect(modelSelect?.querySelector('.ant-select-content-has-value')).toHaveAttribute('title', 'Model Two');
    });

    it('shows a mask for a saved API key without submitting the mask', async() => {
        window.SysConfig.pluginAdmin = [{id: 'ai-provider-deepseek', forms: [{id: 'settings',
            title: 'Provider 设置', fields: [
                {name: 'apiKey', type: 'password', label: 'API Key'},
                {name: 'baseUrl', type: 'url', label: 'API Base URL'}
            ]}]}] as any;
        vi.mocked(http.get).mockImplementation((url: string) => of(url.includes('/forms/')
            ? {errno: 0, data: {baseUrl: 'https://api.deepseek.com'}}
            : {errno: 0, data: {providers: [{id: 'deepseek', label: 'DeepSeek', configured: true,
                admin: {pluginId: 'ai-provider-deepseek', formId: 'settings', testActionId: 'test-connection'},
                models: [{id: 'deepseek-flash', label: 'DeepSeek Flash', selected: true}]}]}}) as any);
        const view = render(<MemoryRouter initialEntries={['/options/ai']}><AIConnections /></MemoryRouter>);
        const key = await view.findByLabelText('API Key') as HTMLInputElement;
        expect(key.value).toBe('••••••••');
        fireEvent.change(view.getByLabelText('API Base URL'), {target: {value: 'https://example.com'}});
        fireEvent.click(within(view.container).getByRole('button', {name: '保存'}));
        await waitFor(() => expect(http.post).toHaveBeenCalledWith(
            '/admin/api/plugins/ai-provider-deepseek/forms/settings',
            {baseUrl: 'https://example.com'},
            {headers: {'X-CSRF-Token': 'test-csrf'}}
        ));
    });

    it('keeps the API Key input empty when no key is configured', async() => {
        window.SysConfig.pluginAdmin = [{id: 'ai-provider-deepseek', forms: [{id: 'settings',
            title: 'Provider 设置', fields: [
                {name: 'apiKey', type: 'password', label: 'API Key'},
                {name: 'baseUrl', type: 'url', label: 'API Base URL'}
            ]}]}] as any;
        vi.mocked(http.get).mockImplementation((url: string) => of(url.includes('/forms/')
            ? {errno: 0, data: {baseUrl: 'https://api.deepseek.com'}}
            : {errno: 0, data: {providers: [{id: 'deepseek', label: 'DeepSeek', configured: false,
                admin: {pluginId: 'ai-provider-deepseek', formId: 'settings', testActionId: 'test-connection'},
                models: [{id: 'deepseek-flash', label: 'DeepSeek Flash', selected: true}]}]}}) as any);
        const view = render(<MemoryRouter initialEntries={['/options/ai']}><AIConnections /></MemoryRouter>);
        const key = await within(view.container).findByLabelText('API Key') as HTMLInputElement;
        expect(key.value).toBe('');
        fireEvent.change(view.getByLabelText('API Base URL'), {target: {value: 'https://example.com'}});
        fireEvent.click(view.getByRole('button', {name: '保存'}));
        await view.findByText('请输入 API Key');
        expect(http.post).not.toHaveBeenCalled();
    });
    it('replaces provider settings when switching providers', async() => {
        const fields = [{name: 'apiKey', type: 'password', label: 'API Key'},
            {name: 'baseUrl', type: 'url', label: 'API Base URL'}];
        window.SysConfig.pluginAdmin = ['first', 'second'].map(id => ({id,
            forms: [{id: 'settings', title: 'Provider 设置', fields}]})) as any;
        vi.mocked(http.get).mockImplementation((url: string) => of(url.includes('/forms/')
            ? {errno: 0, data: url.includes('/first/')
                ? {apiKey: 'first-key', baseUrl: 'https://first.example.com'}
                : {baseUrl: 'https://second.example.com'}}
            : {errno: 0, data: {providers: ['first', 'second'].map((id, index) => ({
                id, label: id, configured: false,
                admin: {pluginId: id, formId: 'settings', testActionId: 'test'},
                models: [{id: 'model', label: 'Model', selected: index === 0}]
            }))}}) as any);
        const view = render(<MemoryRouter initialEntries={['/options/ai']}><AIConnections /></MemoryRouter>);
        await waitFor(() => expect(view.getByLabelText('API Key')).toHaveValue('first-key'));
        fireEvent.change(view.getByLabelText('API Base URL'), {target: {value: 'https://edited.example.com'}});
        fireEvent.click(view.getByRole('button', {name: '增加服务商'}));
        fireEvent.click(view.getByRole('menuitem', {name: 'second'}));
        await waitFor(() => expect(view.getByLabelText('API Base URL')).toHaveValue('https://second.example.com'));
        expect(view.getByLabelText('API Key')).toHaveValue('');
        fireEvent.click(view.getByRole('tab', {name: 'first'}));
        await waitFor(() => expect(view.getByLabelText('API Key')).toHaveValue('first-key'));
        expect(view.getByLabelText('API Base URL')).toHaveValue('https://first.example.com');
    });

});

it('manages independent provider tabs, makes newly saved connections default and removes a connection', async() => {
    window.SysConfig = {csrfToken: 'test-csrf', config: {}, userInfo: {id: 1, name: 'Admin', type: 1},
        pluginAdmin: ['first', 'second'].map(id => ({id, forms: [{id: 'settings', title: '连接配置',
            fields: [{name: 'apiKey', type: 'password', label: 'API Key'}]}]}))} as any;
    vi.spyOn(message, 'success').mockImplementation(() => (() => {}) as any);
    let secondConfigured = false;
    let selectedProvider = 'first';
    vi.mocked(http.get).mockImplementation((url: string) => of(url.includes('/forms/') ? {errno: 0, data: {}}
        : {errno: 0, data: {providers: ['first', 'second'].map(id => ({id, label: id,
            configured: id === 'first' || secondConfigured, removable: id === 'first' || secondConfigured,
            admin: {pluginId: id, formId: 'settings', testActionId: 'test'},
            models: [{id: 'text', label: 'Text', selected: id === selectedProvider}]}))}}) as any);
    vi.mocked(http.post).mockImplementation((url: string, data: any) => {
        if (url.includes('/second/forms/')) secondConfigured = true;
        if (data.action === 'remove') {secondConfigured = false; selectedProvider = 'first'}
        else if (url === '/admin/api/ai-connections') selectedProvider = data.provider;
        return of({errno: 0, data: {}}) as any;
    });
    const view = render(<MemoryRouter initialEntries={['/options/ai']}><AIConnections /></MemoryRouter>);
    await view.findByRole('tab', {name: 'first'});
    expect(view.queryByRole('tab', {name: 'second'})).toBeNull();
    fireEvent.click(view.getByRole('button', {name: '增加服务商'}));
    fireEvent.click(view.getByRole('menuitem', {name: 'second'}));
    const key = await view.findByLabelText('API Key');
    fireEvent.change(key, {target: {value: 'new-test-key'}});
    expect(view.getByRole('button', {name: '测试连接'})).toBeDisabled();
    fireEvent.click(view.getByRole('button', {name: '保存'}));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/api/plugins/second/forms/settings',
        {apiKey: 'new-test-key'}, {headers: {'X-CSRF-Token': 'test-csrf'}}));
    await waitFor(() => expect(view.getByRole('button', {name: '保存'})).toBeDisabled());
    expect(http.post).toHaveBeenCalledWith('/admin/api/ai-connections', {provider: 'second', model: 'text'}, expect.anything());
    expect(await view.findByRole('button', {name: 'second是默认服务商'}))
        .toHaveAttribute('aria-pressed', 'true');
    expect(view.getByRole('tab', {name: 'second'})).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(within(view.getByRole('tab', {name: 'second'}).closest('.ant-tabs-tab') as HTMLElement).getByRole('button', {name: '删除服务商'}));
    fireEvent.click(await view.findByRole('button', {name: /^删\s*除$/}));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/api/ai-connections',
        {action: 'remove', provider: 'second'}, {headers: {'X-CSRF-Token': 'test-csrf'}}));
    await waitFor(() => expect(view.queryByRole('tab', {name: 'second'})).toBeNull());
    expect(view.getByRole('tab', {name: 'first'})).toHaveAttribute('aria-selected', 'true');
});

it('shows standalone tabs and returns keyboard focus to the add button on Escape', async() => {
    window.SysConfig = {pluginAdmin: [], config: {}, csrfToken: 'token', userInfo: {id: 1, name: 'Admin', type: 1}} as any;
    vi.mocked(http.get).mockReturnValue(of({errno: 0, data: {providers: [{id: 'first', label: 'First', configured: true,
        models: [{id: 'text', label: 'Text', selected: true}]}]}}) as any);
    const view = render(<MemoryRouter><AIConnections /></MemoryRouter>);
    const tab = await view.findByRole('tab', {name: 'First'});
    expect(tab.closest('.ant-card')).toBeNull();
    expect(view.getByRole('tabpanel')).toContainElement(view.getByRole('button', {name: '保存'}));
    const add = view.getByRole('button', {name: '增加服务商'});
    fireEvent.click(add);
    const menu = await view.findByRole('menu');
    expect(add).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(menu, {key: 'Escape'});
    expect(add).toHaveAttribute('aria-expanded', 'false');
    expect(add).toHaveFocus();
});
it('retries connection and provider form failures and disables edits while loading', async() => {
    window.SysConfig = {config: {}, csrfToken: 'token', userInfo: {id: 1, name: 'Admin', type: 1},
        pluginAdmin: [{id: 'first', forms: [{id: 'settings', title: 'Provider 设置', fields: [{name: 'apiKey', label: 'API Key', type: 'password'}]}]}]} as any;
    const pending = new Subject<any>();
    vi.mocked(http.get).mockReturnValueOnce(of({errno: 1, errmsg: '列表读取失败'}) as any)
        .mockReturnValueOnce(of({errno: 0, data: {providers: [{id: 'first', label: 'First', configured: true,
            admin: {pluginId: 'first', formId: 'settings', testActionId: 'test'}, models: [{id: 'text', label: 'Text', selected: true}]}]}}) as any)
        .mockReturnValueOnce(of({errno: 1, errmsg: '配置读取失败'}) as any)
        .mockReturnValueOnce(pending as any);
    const view = render(<MemoryRouter><AIConnections /></MemoryRouter>);
    await view.findByText('列表读取失败');
    fireEvent.click(view.getByRole('button', {name: /^重\s*试$/}));
    await view.findByText('配置读取失败');
    expect(view.getByRole('button', {name: '保存'})).toBeDisabled();
    fireEvent.click(view.getByRole('button', {name: /^重\s*试$/}));
    expect(view.getByRole('button', {name: '增加服务商'})).toBeDisabled();
    pending.next({errno: 0, data: {}});
    await view.findByLabelText('API Key');
    expect(view.getByRole('button', {name: '增加服务商'})).toBeEnabled();
    expect(view.queryByText('配置读取失败')).toBeNull();
});

it('confirms the tab being closed without switching the active provider and leaves cancel unchanged', async() => {
    window.SysConfig = {pluginAdmin: [], config: {}, csrfToken: 'token', userInfo: {id: 1, name: 'Admin', type: 1}} as any;
    let removed = false;
    vi.mocked(http.get).mockImplementation(() => of({errno: 0, data: {providers: ['first', 'second'].map(id => ({
        id, label: id, configured: id === 'first' || !removed, removable: true,
        models: [{id: 'text', label: 'Text', selected: id === 'first'}]
    }))}}) as any);
    vi.mocked(http.post).mockImplementation(() => {removed = true; return of({errno: 0, data: {}}) as any});
    const view = render(<ConfigProvider theme={{token: {motion: false}}}><MemoryRouter><AIConnections /></MemoryRouter></ConfigProvider>);
    const close = () => within(view.getByRole('tab', {name: 'second'}).closest('.ant-tabs-tab') as HTMLElement)
        .getByRole('button', {name: '删除服务商'});
    fireEvent.click(close());
    expect(await view.findByRole('dialog')).toHaveTextContent('删除 second 的 AI 连接？');
    expect(view.getByRole('tab', {name: 'first'})).toHaveAttribute('aria-selected', 'true');
    expect(http.post).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('button', {name: /^取\s*消$/}));
    await waitFor(() => expect(view.queryByRole('dialog')).not.toBeInTheDocument());
    expect(http.post).not.toHaveBeenCalled();
    fireEvent.click(close());
    fireEvent.click(await view.findByRole('button', {name: /^删\s*除$/}));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/api/ai-connections',
        {action: 'remove', provider: 'second'}, {headers: {'X-CSRF-Token': 'token'}}));
    await waitFor(() => expect(view.queryByRole('tab', {name: 'second'})).toBeNull());
    expect(view.getByRole('tab', {name: 'first'})).toHaveAttribute('aria-selected', 'true');
    expect(view.getByRole('tabpanel').querySelector('.ant-btn-dangerous')).toBeNull();
});

it('sets the selected model from a tab star immediately and never toggles the default off', async() => {
    window.SysConfig = {pluginAdmin: [], config: {}, csrfToken: 'token', userInfo: {id: 1, name: 'Admin', type: 1}} as any;
    vi.spyOn(message, 'success').mockImplementation(() => (() => {}) as any);
    vi.mocked(http.get).mockReturnValue(of({errno: 0, data: {providers: ['first', 'second'].map(id => ({
        id, label: id, configured: true, models: [
            {id: 'one', label: 'One', selected: id === 'first'}, {id: 'two', label: 'Two', selected: false}
        ]
    }))}}) as any);
    vi.mocked(http.post).mockReturnValue(of({errno: 0, data: {}}) as any);
    const view = render(<MemoryRouter><AIConnections /></MemoryRouter>);
    fireEvent.click(await view.findByRole('tab', {name: 'second'}));
    fireEvent.mouseDown(view.getByRole('combobox', {name: '选择 AI 模型'}));
    fireEvent.click(view.getByText('Two', {selector: '.ant-select-item-option-content'}));
    fireEvent.click(view.getByRole('button', {name: '将second设为默认模型'}));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/api/ai-connections',
        {provider: 'second', model: 'two'}, {headers: {'X-CSRF-Token': 'token'}}));
    const star = await view.findByRole('button', {name: 'second是默认服务商'});
    expect(star).toBeDisabled();
    expect(star).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(star);
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(view.getByRole('tab', {name: 'second'})).toHaveAttribute('aria-selected', 'true');
    expect(view.queryByRole('button', {name: '设为默认模型'})).toBeNull();
});
