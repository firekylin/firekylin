import {fireEvent, render, waitFor} from '@testing-library/react';
import {of} from 'rxjs';
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
        window.SysConfig = {pluginAdmin: [], csrfToken: 'test-csrf'} as unknown as typeof window.SysConfig;
        vi.mocked(http.get).mockReturnValue(of({errno: 0, data: {content: {providers: [{
            id: 'deepseek', label: 'DeepSeek', configured: false,
            models: [{id: 'deepseek-flash', label: 'DeepSeek Flash', selected: false}]
        }]}}} as any));
        vi.mocked(http.post).mockReturnValue(of({errno: 0, data: {message: 'AI 连接已禁用。'}} as any));
    });

    it('leaves the provider empty and saves a cleared default', async() => {
        const view = render(<AIConnections />);
        await waitFor(() => expect(view.getByText('请选择')).toBeInTheDocument());
        expect(view.queryByText('未配置')).not.toBeInTheDocument();
        fireEvent.click(view.getByRole('button', {name: '保存并禁用 AI 连接'}));
        await waitFor(() => expect(http.post).toHaveBeenCalledWith(
            '/admin/api/plugins/core-ai/actions/clear-default', {},
            {headers: {'X-CSRF-Token': 'test-csrf'}}
        ));
    });
});
