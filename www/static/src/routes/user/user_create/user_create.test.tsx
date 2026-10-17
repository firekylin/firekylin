import { render } from '@testing-library/react';
import { BrowserRouter } from '@admin/utils/router';
import { describe, expect, it, vi } from 'vitest';

import { UserCreateForm } from './user_create';

describe('UserCreateForm', () => {
    it('clears user data during its first render', () => {
        const setUserInfo = vi.fn();
        const userStore = {
            setUserInfo,
            userInfo: {},
            submitting: false,
        };
        window.SysConfig = {
            config: { disallow_file_edit: false },
            options: { ldap_on: '0', password_salt: 'salt' },
            userInfo: { id: 1, name: 'Admin', type: 1 },
        } as typeof window.SysConfig;

        const routeProps = {
            history: { push: vi.fn() },
            location: { pathname: '/user/create' },
            match: { params: {} },
        };

        render(
            <BrowserRouter>
                <UserCreateForm
                    {...(routeProps as any)}
                    userStore={userStore as any}
                />
            </BrowserRouter>,
        );
        expect(setUserInfo).toHaveBeenCalledWith(
            expect.objectContaining({ name: '', email: '' }),
        );
    });
});
