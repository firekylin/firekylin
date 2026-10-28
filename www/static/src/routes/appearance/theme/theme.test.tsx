import {cleanup, fireEvent, render, waitFor, within} from '@testing-library/react';
import {of} from 'rxjs';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {MemoryRouter} from '../../../utils/router';
import {ThemeForm} from './theme';

vi.mock('../../../components/breadcrumb', () => ({default: () => null}));

afterEach(cleanup);

describe('theme management', () => {
    it('shows theme defaults for unset settings and preserves explicit values', async () => {
        const theme = {id: 'clarity', name: 'Clarity', version: '1.0.0', configElements: [
            {name: 'enabled', type: 'checkbox', label: '开关', options: [{label: '启用', value: '1'}], default: ['1']},
            {name: 'title', type: 'text', label: '标题', default: '默认标题'},
            {name: 'disabled', type: 'checkbox', label: '已关闭', options: [{label: '关闭项', value: '1'}], default: ['1']}
        ]};
        const store = {themeList: [theme], data: {theme: 'clarity'}, getThemeList: vi.fn(),
            getOptions: () => of({errno: 0, data: {theme: 'clarity', themeConfig: JSON.stringify({disabled: []})}}),
            setData: vi.fn(), themeConfigSave: vi.fn()};
        window.SysConfig = {options: {theme: 'clarity'}} as any;
        const view = render(<MemoryRouter initialEntries={['/appearance/theme/settings']}><ThemeForm themeStore={store as any} {...({history: {push: vi.fn()}} as any)} /></MemoryRouter>);
        expect(view.getByRole('checkbox', {name: '启用'})).toBeChecked();
        expect(view.getByRole('checkbox', {name: '关闭项'})).not.toBeChecked();
        expect(view.getByDisplayValue('默认标题')).toBeInTheDocument();
        fireEvent.click(view.getByRole('checkbox', {name: '启用'}));
        fireEvent.click(view.getByRole('button', {name: '保存配置'}));
        await waitFor(() => expect(store.themeConfigSave).toHaveBeenCalledWith({themeConfig: JSON.stringify({disabled: [], enabled: []})}));
    });
    it('filters themes and activates the selected theme', () => {
        const store = {
            themeList: [
                {id: 'one', name: 'One', version: '1.0.0', configElements: []},
                {id: 'two', name: 'Two', version: '2.0.0', configElements: []}
            ],
            data: {theme: 'one'}, getThemeList: vi.fn(),
            getOptions: () => of({errno: 0, data: {theme: 'one'}}),
            setData: vi.fn(), themeSelect: vi.fn()
        };
        window.SysConfig = {options: {theme: 'one'}} as any;
        const push = vi.fn();
        const view = render(<MemoryRouter><ThemeForm themeStore={store as any} {...({history: {push}} as any)} /></MemoryRouter>);
        fireEvent.click(view.getByRole('button', {name: '安装主题'}));
        expect(push).toHaveBeenCalledWith('/appearance/install-theme');
        fireEvent.change(view.getByPlaceholderText('搜索主题'), {target: {value: 'two'}});
        expect(view.queryByText('One')).not.toBeInTheDocument();
        const card = view.getByText('Two').closest('.theme-card') as HTMLElement;
        fireEvent.click(within(card).getByRole('button', {name: /启\s*用/}));
        expect(store.themeSelect).toHaveBeenCalledWith({theme: 'two'});
    });
});
