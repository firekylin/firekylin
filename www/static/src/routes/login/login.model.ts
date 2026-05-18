import LoginStore from './login.store';
import { RouteComponentProps } from 'react-router';

export interface LoginProps extends RouteComponentProps<any> {
    loginStore: LoginStore;
}