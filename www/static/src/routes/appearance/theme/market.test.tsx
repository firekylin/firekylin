import {cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
import {message, Modal} from 'antd';
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
        ? {items: [{id: 'paper', name: 'paper', title: 'Paper', version: '1.0.0', description: 'Test', screenshot: 'https://example.com/paper.png'}]}
        : {themes: []}}}) as any);
    vi.mocked(axios.post).mockResolvedValue({data: {errno: 0, data: {id: 'paper'}}} as any);
});
it('searches themes and requests installation of the selected version', async() => {
    vi.spyOn(message, 'success').mockImplementation(() => ({}) as any);
    vi.spyOn(Modal, 'confirm').mockImplementation((options: any) => { options.onOk(); return {} as any });
    const view = render(<MemoryRouter><ThemeMarket /></MemoryRouter>);
    const card = (await view.findByText('Paper')).closest('.theme-card') as HTMLElement;
    expect(within(card).getByRole('img', {name: 'Paper 预览'})).toHaveAttribute('src', 'https://example.com/paper.png');
    expect(within(card).getByText('版本 1.0.0')).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', {name: /安\s*装/}));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/admin/api/marketplace',
        {operation: 'theme.install-registry', name: 'paper', version: '1.0.0'},
        {headers: {'X-CSRF-Token': 'csrf'}}));
    await waitFor(() => expect(message.success).toHaveBeenCalledWith('主题安装完成'));
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(4));
    fireEvent.change(view.getByPlaceholderText('搜索主题'), {target: {value: 'missing'}});
    expect(view.queryByText('Paper')).not.toBeInTheDocument();
});
it('shows a registry failure and links to settings', async() => {
    vi.mocked(axios.get).mockRejectedValue(new Error('offline'));
    const view = render(<MemoryRouter><ThemeMarket /></MemoryRouter>);
    expect(await view.findByText('主题市场暂不可用')).toBeInTheDocument();
    expect(view.getByRole('link', {name: '市场设置'})).toHaveAttribute('href', '/options/extensions');
});

it('shows a placeholder when the preview is unavailable and the installed state', async() => {
    vi.mocked(axios.get).mockImplementation(async url => ({data: {errno: 0, data: url.includes('extension-settings')
        ? {items: [{id: 'paper', name: 'paper', title: 'Paper', version: '1.0.0', screenshot: 'https://example.com/paper.png'}]}
        : {themes: [{id: 'paper'}]}}}) as any);
    const view = render(<MemoryRouter><ThemeMarket /></MemoryRouter>);
    const card = (await view.findByText('Paper')).closest('.theme-card') as HTMLElement;
    fireEvent.error(within(card).getByRole('img', {name: 'Paper 预览'}));
    expect(within(card).getByText('暂无预览')).toBeInTheDocument();
    expect(within(card).getByText('已安装')).toBeInTheDocument();
    expect(within(card).queryByRole('button', {name: /安\s*装/})).not.toBeInTheDocument();
});
it('offers an update when a newer version of the installed theme is available', async() => {
    vi.mocked(axios.get).mockImplementation(async url => ({data: {errno: 0, data: url.includes('extension-settings')
        ? {items: [{id: 'paper', name: 'paper', title: 'Paper', version: '2.0.0'}]}
        : {themes: [{id: 'paper', name: 'paper', version: '1.0.0'}]}}}) as any);
    vi.spyOn(message, 'success').mockImplementation(() => ({}) as any);
    vi.spyOn(Modal, 'confirm').mockImplementation((options: any) => { options.onOk(); return {} as any });
    const view = render(<MemoryRouter><ThemeMarket /></MemoryRouter>);
    fireEvent.click(await view.findByRole('button', {name: /更\s*新/}));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/admin/api/marketplace',
        {operation: 'theme.update-registry', name: 'paper', version: '2.0.0'},
        {headers: {'X-CSRF-Token': 'csrf'}}));
    await waitFor(() => expect(message.success).toHaveBeenCalledWith('主题更新完成'));
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(4));
});
