import {cleanup, fireEvent, render, within} from '@testing-library/react';
import {of} from 'rxjs';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {MemoryRouter} from '../../../utils/router';
import {ThemeForm} from './theme';

vi.mock('../../../components/breadcrumb', () => ({default: () => null}));

afterEach(cleanup);

describe('theme management', () => {
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
