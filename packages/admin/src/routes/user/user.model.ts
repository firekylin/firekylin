import UserStore from  './user.store';
import { RouteComponentProps } from 'react-router';

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