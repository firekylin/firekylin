import {cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
import {message, Modal} from 'antd';
import axios from 'axios';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {MemoryRouter} from '../../utils/router';
import PluginMarket from './market';

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
vi.mock('../../components/breadcrumb', () => ({default: () => null}));
afterEach(() => { cleanup(); vi.restoreAllMocks() });
beforeEach(() => {
    window.SysConfig = {csrfToken: 'csrf'} as any;
    vi.mocked(axios.get).mockImplementation(async url => ({data: {errno: 0, data: url.includes('extension-settings')
        ? {items: [{name: 'firekylin-plugin-demo', title: 'Demo', version: '1.0.0', description: 'Test'}]}
        : {plugins: []}}}) as any);
    vi.mocked(axios.post).mockResolvedValue({data: {errno: 0, data: {restartRequired: true}}} as any);
});
it('searches the registry and requests installation of the selected exact version', async() => {
    vi.spyOn(message, 'success').mockImplementation(() => ({}) as any);
    vi.spyOn(Modal, 'confirm').mockImplementation((options: any) => { options.onOk(); return {} as any });
    const view = render(<MemoryRouter><PluginMarket /></MemoryRouter>);
    const name = await view.findByText('Demo');
    const row = name.closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', {name: /安\s*装/}));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/admin/api/marketplace',
        {operation: 'plugin.install-registry', name: 'firekylin-plugin-demo', version: '1.0.0'},
        {headers: {'X-CSRF-Token': 'csrf'}}));
    await waitFor(() => expect(message.success).toHaveBeenCalledWith('安装完成，请重启 Firekylin 后启用插件'));
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(4));
    fireEvent.change(view.getByPlaceholderText('搜索插件'), {target: {value: 'not-found'}});
    expect(view.queryByText('Demo')).not.toBeInTheDocument();
});
it('shows a registry failure and links to settings', async() => {
    vi.mocked(axios.get).mockRejectedValue(new Error('offline'));
    const view = render(<MemoryRouter><PluginMarket /></MemoryRouter>);
    expect(await view.findByText('插件市场暂不可用')).toBeInTheDocument();
    expect(view.getByRole('link', {name: '市场设置'})).toHaveAttribute('href', '/options/extensions');
});
it('offers an update only for a newer installed npm plugin', async() => {
    vi.spyOn(message, 'success').mockImplementation(() => ({}) as any);
    vi.mocked(axios.get).mockImplementation(async url => ({data: {errno: 0, data: url.includes('extension-settings')
        ? {items: [{name: 'firekylin-plugin-demo', title: 'Demo', version: '2.0.0'}]}
        : {plugins: [{name: 'firekylin-plugin-demo', version: '1.0.0', source: 'npm'}]}}}) as any);
    vi.spyOn(Modal, 'confirm').mockImplementation((options: any) => { options.onOk(); return {} as any });
    const view = render(<MemoryRouter><PluginMarket /></MemoryRouter>);
    fireEvent.click(await view.findByRole('button', {name: '更新'}));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/admin/api/marketplace',
        {operation: 'plugin.update-registry', name: 'firekylin-plugin-demo', version: '2.0.0'},
        {headers: {'X-CSRF-Token': 'csrf'}}));
    await waitFor(() => expect(message.success).toHaveBeenCalledWith('更新完成，请重启 Firekylin 后生效'));
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(4));
});
