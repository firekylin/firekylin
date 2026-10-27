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
it('saves the repository and token, then clears the token field', async() => {
    const view = render(<ExtensionGitHub />);
    const repository = await view.findByLabelText('GitHub 仓库地址');
    await waitFor(() => expect(repository).not.toBeDisabled());
    fireEvent.change(repository, {target: {value: 'https://github.com/owner/site'}});
    const token = view.getByLabelText('GitHub 访问令牌') as HTMLInputElement;
    fireEvent.change(token, {target: {value: 'private-token'}});
    fireEvent.click(view.getByRole('button', {name: '保存连接'}));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/admin/api/extension-github',
        {repository: 'https://github.com/owner/site', token: 'private-token'}, {headers: {'X-CSRF-Token': 'test-csrf'}}));
    await waitFor(() => expect(token.value).toBe(''));
    expect(view.getByRole('button', {name: '移除连接'})).toBeInTheDocument();
});
