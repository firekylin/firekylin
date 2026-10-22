import {fireEvent, render, waitFor} from '@testing-library/react';
import {of} from 'rxjs';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import AIConnections from './ai-connections';
import {http} from '../../utils/http';
import {InitiateRoutes, InitiateThemePages} from '../../components/data/routes.data';

vi.mock('../../utils/http', () => ({
    http: {get: vi.fn(), post: vi.fn()}
}));

describe('AI connections', () => {
    it('appears under system settings', () => {
        const options = InitiateRoutes(InitiateThemePages).find(item => item.url === '/options');
        expect(options?.children?.some(item => item.url === '/options/ai')).toBe(true);
    });

    beforeEach(() => {
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
        await waitFor(() => expect(view.getByText('请选择')).toBeInTheDocument());
        expect(view.queryByText('未配置')).not.toBeInTheDocument();
        expect(view.getByRole('button', {name: '保存'})).toBeDisabled();
        fireEvent.mouseDown(view.getByRole('combobox', {name: '选择 AI 服务商'}));
        fireEvent.click(view.getByText('DeepSeek'));
        await waitFor(() => expect(view.getByRole('button', {name: '保存'})).toBeEnabled());
        fireEvent.click(view.getByRole('button', {name: '保存'}));
        await waitFor(() => expect(http.post).toHaveBeenCalledWith(
            '/admin/api/ai-connections', {provider: 'deepseek', model: 'deepseek-flash'},
            {headers: {'X-CSRF-Token': 'test-csrf'}}
        ));
    });
});
