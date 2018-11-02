import LoginStore from './login.store';
import { FormComponentProps } from 'antd/lib/form';
import { RouteComponentProps } from 'react-router';

export interface LoginProps extends FormComponentProps, RouteComponentProps<any> {
    loginStore: LoginStore;
}