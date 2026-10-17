import { render } from '@testing-library/react';
import { BrowserRouter } from '@admin/utils/router';
import { describe, expect, it } from 'vitest';

import { UserEditPwdForm } from './user_edit_pwd';

describe('UserEditPwdForm', () => {
    it('renders the page header without shadowing route props', () => {
        window.SysConfig = {
            config: { disallow_file_edit: false },
            options: { ldap_on: '0', password_salt: 'salt' },
            userInfo: { id: 1, name: 'Admin', type: 1 },
        } as typeof window.SysConfig;

        const userStore = {
            userEditPwdState: { submitting: false },
        };

        const view = render(
            <BrowserRouter>
                <UserEditPwdForm userStore={userStore as any} />
            </BrowserRouter>,
        );

        expect(view.getByText('修改密码')).toBeInTheDocument();
        expect(view.getByText('Admin')).toBeInTheDocument();
    });
});
