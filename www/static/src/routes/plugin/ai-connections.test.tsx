import {cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
import {message} from 'antd';
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

    it('leaves the provider empty and enables save after a change', async() => {
        const view = render(<MemoryRouter initialEntries={['/options/ai']}><AIConnections /></MemoryRouter>);
        expect(view.getByText('系统设置')).toBeInTheDocument();
        expect(view.container.querySelector('h3.page-title')).toHaveTextContent('AI 连接');
        await waitFor(() => expect(view.getByText('选择要增加的服务商')).toBeInTheDocument());
        expect(view.queryByText('未配置')).not.toBeInTheDocument();
        expect(view.getByRole('button', {name: '保存'})).toBeDisabled();
        fireEvent.mouseDown(view.getByRole('combobox', {name: '选择 AI 服务商'}));
        fireEvent.click(view.getByText('DeepSeek'));
        fireEvent.click(view.getByRole('button', {name: '设为默认模型'}));
        await waitFor(() => expect(view.getByRole('button', {name: '保存'})).toBeEnabled());
        fireEvent.click(within(view.container).getByRole('button', {name: '保存'}));
        await waitFor(() => expect(http.post).toHaveBeenCalledWith(
            '/admin/api/ai-connections', {provider: 'deepseek', model: 'deepseek-flash'},
            {headers: {'X-CSRF-Token': 'test-csrf'}}
        ));
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
        fireEvent.mouseDown(view.getByRole('combobox', {name: '选择 AI 服务商'}));
        fireEvent.click(view.getByText('second', {selector: '.ant-select-item-option-content'}));
        await waitFor(() => expect(view.getByLabelText('API Base URL')).toHaveValue('https://second.example.com'));
        expect(view.getByLabelText('API Key')).toHaveValue('');
        fireEvent.click(view.getByRole('tab', {name: 'first'}));
        await waitFor(() => expect(view.getByLabelText('API Key')).toHaveValue('first-key'));
        expect(view.getByLabelText('API Base URL')).toHaveValue('https://first.example.com');
    });

});

it('manages independent provider tabs, saves without replacing the default and removes a connection', async() => {
    window.SysConfig = {csrfToken: 'test-csrf', config: {}, userInfo: {id: 1, name: 'Admin', type: 1},
        pluginAdmin: ['first', 'second'].map(id => ({id, forms: [{id: 'settings', title: '连接配置',
            fields: [{name: 'apiKey', type: 'password', label: 'API Key'}]}]}))} as any;
    vi.spyOn(message, 'success').mockImplementation(() => (() => {}) as any);
    let secondConfigured = false;
    vi.mocked(http.get).mockImplementation((url: string) => of(url.includes('/forms/') ? {errno: 0, data: {}}
        : {errno: 0, data: {providers: ['first', 'second'].map(id => ({id, label: id,
            configured: id === 'first' || secondConfigured, removable: id === 'first' || secondConfigured,
            admin: {pluginId: id, formId: 'settings', testActionId: 'test'},
            models: [{id: 'text', label: 'Text', selected: id === 'first'}]}))}}) as any);
    vi.mocked(http.post).mockImplementation((url: string, data: any) => {
        if (url.includes('/second/forms/')) secondConfigured = true;
        if (data.action === 'remove') secondConfigured = false;
        return of({errno: 0, data: {}}) as any;
    });
    const view = render(<MemoryRouter initialEntries={['/options/ai']}><AIConnections /></MemoryRouter>);
    await view.findByRole('tab', {name: 'first'});
    expect(view.queryByRole('tab', {name: 'second'})).toBeNull();
    fireEvent.click(view.getByRole('button', {name: '增加服务商'}));
    fireEvent.mouseDown(view.getByRole('combobox', {name: '选择 AI 服务商'}));
    fireEvent.click(view.getByText('second', {selector: '.ant-select-item-option-content'}));
    const key = await view.findByLabelText('API Key');
    fireEvent.change(key, {target: {value: 'new-test-key'}});
    expect(view.getByRole('button', {name: '测试连接'})).toBeDisabled();
    fireEvent.click(view.getByRole('button', {name: '保存'}));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/api/plugins/second/forms/settings',
        {apiKey: 'new-test-key'}, {headers: {'X-CSRF-Token': 'test-csrf'}}));
    await waitFor(() => expect(view.getByRole('button', {name: '保存'})).toBeDisabled());
    expect(http.post).not.toHaveBeenCalledWith('/admin/api/ai-connections', expect.anything(), expect.anything());
    expect(view.getByRole('tab', {name: 'second'})).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(view.getByRole('button', {name: '删除服务商'}));
    fireEvent.click(await view.findByRole('button', {name: /^删\s*除$/}));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/api/ai-connections',
        {action: 'remove', provider: 'second'}, {headers: {'X-CSRF-Token': 'test-csrf'}}));
    await waitFor(() => expect(view.queryByRole('tab', {name: 'second'})).toBeNull());
    expect(view.getByRole('tab', {name: 'first'})).toHaveAttribute('aria-selected', 'true');
});
