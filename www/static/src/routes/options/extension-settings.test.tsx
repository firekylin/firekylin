import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import axios from 'axios';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {MemoryRouter} from '../../utils/router';
import ExtensionSettings from './extension-settings';

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
vi.mock('../../components/breadcrumb', () => ({default: () => null}));
afterEach(cleanup);
beforeEach(() => {
    window.SysConfig = {csrfToken: 'test-token'} as any;
    vi.mocked(axios.get).mockResolvedValue({data: {errno: 0, data: {settings: {
        pluginRegistry: 'https://firekylin.lithub.cc/plugins/plugin', themeRegistry: 'https://firekylin.lithub.cc/plugins/theme'
    }}}} as any);
    vi.mocked(axios.post).mockImplementation(async (_url, body) => ({data: {errno: 0, data: body}}) as any);
});
it('loads and saves separate plugin and theme registries', async() => {
    const view = render(<MemoryRouter><ExtensionSettings /></MemoryRouter>);
    const plugin = await view.findByLabelText('插件市场') as HTMLInputElement;
    await waitFor(() => expect(plugin.value).toBe('https://firekylin.lithub.cc/plugins/plugin'));
    fireEvent.change(plugin, {target: {value: 'https://firekylin.lithub.cc/plugins/other'}});
    fireEvent.click(view.getByRole('button', {name: /^保\s*存$/}));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/admin/api/extension-settings',
        {settings: {pluginRegistry: 'https://firekylin.lithub.cc/plugins/other', themeRegistry: 'https://firekylin.lithub.cc/plugins/theme'}},
        {headers: {'X-CSRF-Token': 'test-token'}}));
});
