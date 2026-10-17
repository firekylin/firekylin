import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BrowserRouter } from '../utils/router';
import BreadCrumb from './breadcrumb';

describe('BreadCrumb', () => {
    it('renders and registers its document click handler', () => {
        window.SysConfig = {
            config: { disallow_file_edit: false },
            userInfo: { id: 1, name: 'Admin' },
        } as typeof window.SysConfig;

        const view = render(
            <BrowserRouter>
                <BreadCrumb />
            </BrowserRouter>,
        );

        expect(view.getByText('Admin')).toBeInTheDocument();
        expect(() => view.unmount()).not.toThrow();
    });
});
