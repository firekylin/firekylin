import {cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
import {of} from 'rxjs';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {MemoryRouter} from '../../utils/router';
import {http} from '../../utils/http';
import PluginManagement from './management';

vi.mock('../../utils/http', () => ({http: {get: vi.fn(), post: vi.fn()}}));
vi.mock('../../components/breadcrumb', () => ({default: () => null}));
afterEach(cleanup);
beforeEach(() => {
    window.SysConfig = {csrfToken: 'token', pluginAdmin: []} as any;
    vi.mocked(http.get).mockReturnValue(of({errno: 0, data: {plugins: [
        {id: 'one', name: 'One', version: '1', description: 'first', status: 'active', source: 'npm', reasons: []},
        {id: 'two', name: 'Two', version: '2', description: 'second', status: 'inactive', source: 'local', reasons: []}
    ]}}) as any);
    vi.mocked(http.post).mockReturnValue(of({errno: 0, data: {restartRequired: true}}) as any);
});
it('filters installed plugins and sends an enable request', async () => {
    const view = render(<MemoryRouter><PluginManagement /></MemoryRouter>);
    fireEvent.change(view.getByPlaceholderText('搜索插件名称'), {target: {value: 'two'}});
    expect(view.queryByText('One')).not.toBeInTheDocument();
    const row = view.getByText('Two').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', {name: /启\s*用/}));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/api/marketplace',
        {operation: 'plugin.enable', id: 'two', name: 'Two'}, {headers: {'X-CSRF-Token': 'token'}}));
});
