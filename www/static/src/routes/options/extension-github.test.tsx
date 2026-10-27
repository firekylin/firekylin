import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import axios from 'axios';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import ExtensionGitHub from './extension-github';

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
afterEach(cleanup);
beforeEach(() => {
    window.SysConfig = {csrfToken: 'test-csrf'} as any;
    vi.mocked(axios.get).mockResolvedValue({data: {errno: 0, data: {connected: false}}} as any);
    vi.mocked(axios.post).mockResolvedValue({data: {errno: 0, data: {connected: true,
        repository: 'https://github.com/owner/site'}}} as any);
});
it('defaults to local management without requiring GitHub details', async() => {
    const view = render(<ExtensionGitHub />);
    await waitFor(() => expect(view.getByRole('radio', {name: '本地管理'})).toBeChecked());
    expect(view.queryByLabelText('Firekylin 网站仓库地址')).not.toBeInTheDocument();
    fireEvent.click(view.getByRole('button', {name: '保存管理方式'}));
    expect(axios.post).not.toHaveBeenCalled();
});
it('shows the GitHub fields and token guidance, and saves the connection', async() => {
    const view = render(<ExtensionGitHub />);
    await waitFor(() => expect(view.getByRole('radio', {name: 'GitHub'})).not.toBeDisabled());
    fireEvent.click(view.getByRole('radio', {name: 'GitHub'}));
    const repository = await view.findByLabelText('Firekylin 网站仓库地址');
    expect(view.getByRole('link', {name: 'GitHub 申请令牌'})).toHaveAttribute('href',
        'https://github.com/settings/personal-access-tokens/new');
    expect(view.getByText(/请确保令牌对该网站仓库具有 Contents 和 Pull requests 的写入权限/)).toBeInTheDocument();
    fireEvent.change(repository, {target: {value: 'https://github.com/owner/site'}});
    const token = view.getByLabelText('GitHub Token') as HTMLInputElement;
    fireEvent.change(token, {target: {value: 'private-token'}});
    fireEvent.click(view.getByRole('button', {name: '保存管理方式'}));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/admin/api/extension-github',
        {repository: 'https://github.com/owner/site', token: 'private-token'}, {headers: {'X-CSRF-Token': 'test-csrf'}}));
    await waitFor(() => expect(token.value).toBe(''));
});
it('switches an existing connection to local and removes its credential', async() => {
    vi.mocked(axios.get).mockResolvedValue({data: {errno: 0, data: {connected: true,
        repository: 'https://github.com/owner/site'}}} as any);
    vi.mocked(axios.post).mockResolvedValue({data: {errno: 0, data: {connected: false}}} as any);
    const view = render(<ExtensionGitHub />);
    await waitFor(() => expect(view.getByRole('radio', {name: 'GitHub'})).toBeChecked());
    fireEvent.click(view.getByRole('radio', {name: '本地管理'}));
    await waitFor(() => expect(view.queryByLabelText('Firekylin 网站仓库地址')).not.toBeInTheDocument());
    fireEvent.click(view.getByRole('button', {name: '保存管理方式'}));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/admin/api/extension-github',
        {disconnect: true}, {headers: {'X-CSRF-Token': 'test-csrf'}}));
});
