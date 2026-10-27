import {cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
import {of} from 'rxjs';
import {Modal} from 'antd';
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
it('shows author and npm links for locally installed packages', () => {
    vi.mocked(http.get).mockReturnValue(of({errno: 0, data: {plugins: [{id: 'demo', name: '@firekylin/plugin-demo',
        version: '1', description: 'example', status: 'inactive', source: 'local', reasons: [],
        author: 'Alice', authorUrl: 'https://example.org/alice'}]}}) as any);
    const view = render(<MemoryRouter><PluginManagement /></MemoryRouter>);
    expect(view.getByRole('link', {name: '@Alice'})).toHaveAttribute('href', 'https://example.org/alice');
    expect(view.getByRole('link', {name: '查看详情'})).toHaveAttribute('href',
        'https://www.npmjs.com/package/%40firekylin%2Fplugin-demo');
});
it('refreshes status after workers apply a state change and updates the configuration link', async () => {
    const plugin = {id: 'two', name: 'Two', version: '2', description: 'second', status: 'inactive',
        source: 'local', reasons: []};
    const response = (status: string, pluginAdmin: any[] = []) => ({errno: 0,
        data: {plugins: [{...plugin, status}], pluginAdmin}});
    vi.mocked(http.get).mockReturnValueOnce(of(response('inactive')) as any)
        .mockReturnValueOnce(of(response('inactive')) as any)
        .mockReturnValue(of(response('active', [{id: 'two', pages: [{id: 'settings'}], forms: []}])) as any);
    vi.mocked(http.post).mockReturnValue(of({errno: 0, data: {restartRequired: false}}) as any);
    const view = render(<MemoryRouter><PluginManagement /></MemoryRouter>);
    fireEvent.click(view.getByRole('button', {name: '启用'}));
    expect(await view.findByRole('button', {name: '停用'}, {timeout: 3000})).toBeInTheDocument();
    expect(view.getByRole('link', {name: '配置'})).toHaveAttribute('href', '/plugins/two/settings');
    expect(http.get).toHaveBeenCalledTimes(3);
});
it('refreshes the list after deleting a plugin', async () => {
    const plugin = {id: 'two', name: 'Two', version: '2', description: 'second', status: 'inactive',
        source: 'local', reasons: []};
    vi.mocked(http.get).mockReturnValueOnce(of({errno: 0, data: {plugins: [plugin]}}) as any)
        .mockReturnValue(of({errno: 0, data: {plugins: []}}) as any);
    vi.mocked(http.post).mockReturnValue(of({errno: 0, data: {restartRequired: false}}) as any);
    const confirm = vi.spyOn(Modal, 'confirm').mockImplementation((options: any) => { options.onOk(); return {} as any });
    const view = render(<MemoryRouter><PluginManagement /></MemoryRouter>);
    fireEvent.click(view.getByRole('button', {name: '删除'}));
    confirm.mockRestore();
    await waitFor(() => expect(view.queryByText('Two')).not.toBeInTheDocument());
});
