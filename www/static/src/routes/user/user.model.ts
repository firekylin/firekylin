import UserStore from  './user.store';

export interface UserProps {
    userStore: UserStore;
}

export interface UserEditPwdState {
    userInfo ?: any;
    submitting ?: boolean;
}