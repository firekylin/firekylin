import LoginStore from './login.store';
import { RouteComponentProps } from '@admin/utils/router';

export interface LoginProps extends RouteComponentProps<any> {
    loginStore: LoginStore;
}
