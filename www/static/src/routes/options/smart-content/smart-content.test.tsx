import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import axios from 'axios';
import {MemoryRouter} from '../../../utils/router';
import SmartContentSettings from './smart-content';
vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
afterEach(cleanup);
beforeEach(() => {
    window.SysConfig = {pluginAdmin: [], config: {}, csrfToken: 'token', userInfo: {id: 1, name: 'Admin', type: 1}} as any;
    vi.mocked(axios.get).mockResolvedValue({data: {errno: 0, data: {features: {
        summary: true, title: false, rewrite: true, translate: true, slug: false, category: false, autocomplete: false,
    }}}});
    vi.mocked(axios.post).mockResolvedValue({data: {errno: 0, data: {features: {title: true}}}});
});
it('shows seven described switches without a plugin or language setting and saves to core', async() => {
    render(<MemoryRouter initialEntries={['/options/smart-content']}><SmartContentSettings /></MemoryRouter>);
    const title = await screen.findByRole('switch', {name: '生成标题'});
    await waitFor(() => expect(title).not.toBeDisabled());
    expect(screen.getAllByRole('switch')).toHaveLength(7);
    expect(title).not.toBeChecked();
    expect(screen.getByText(/正文超过 250 个字时，生成标题建议/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(title);
    fireEvent.click(screen.getByRole('button', {name: /保\s*存/}));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/admin/api/smart-content',
        {features: expect.objectContaining({title: true})}, {headers: {'X-CSRF-Token': 'token'}}));
});
