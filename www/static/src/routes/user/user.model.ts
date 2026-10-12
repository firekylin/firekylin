import UserStore from  './user.store';
import { RouteComponentProps } from '@admin/utils/router';

export interface UserProps extends RouteComponentProps<UserMatchParams> {
    userStore: UserStore;
}

export interface UserEditPwdState {
    userInfo ?: any;
    submitting ?: boolean;
}

interface UserMatchParams {
    id: string;
}
