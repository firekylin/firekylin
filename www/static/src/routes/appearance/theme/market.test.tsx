import {cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
import {Modal} from 'antd';
import axios from 'axios';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {MemoryRouter} from '../../../utils/router';
import ThemeMarket from './market';

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
vi.mock('../../../components/breadcrumb', () => ({default: () => null}));
afterEach(() => { cleanup(); vi.restoreAllMocks() });
beforeEach(() => {
    window.SysConfig = {csrfToken: 'csrf'} as any;
    vi.mocked(axios.get).mockImplementation(async url => ({data: {errno: 0, data: url.includes('extension-settings')
        ? {items: [{id: 'paper', name: 'paper', title: 'Paper', version: '1.0.0', description: 'Test'}]}
        : {themes: []}}}) as any);
    vi.mocked(axios.post).mockResolvedValue({data: {errno: 0, data: {id: 'paper'}}} as any);
});
it('searches themes and requests installation of the selected version', async() => {
    vi.spyOn(Modal, 'confirm').mockImplementation((options: any) => { options.onOk(); return {} as any });
    const view = render(<MemoryRouter><ThemeMarket /></MemoryRouter>);
    const row = (await view.findByText('Paper')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', {name: /安\s*装/}));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/admin/api/marketplace',
        {operation: 'theme.install-registry', name: 'paper', version: '1.0.0'},
        {headers: {'X-CSRF-Token': 'csrf'}}));
    fireEvent.change(view.getByPlaceholderText('搜索主题'), {target: {value: 'missing'}});
    expect(view.queryByText('Paper')).not.toBeInTheDocument();
});
it('shows a registry failure and links to settings', async() => {
    vi.mocked(axios.get).mockRejectedValue(new Error('offline'));
    const view = render(<MemoryRouter><ThemeMarket /></MemoryRouter>);
    expect(await view.findByText('主题市场暂不可用')).toBeInTheDocument();
    expect(view.getByRole('link', {name: '市场设置'})).toHaveAttribute('href', '/options/extensions');
});
