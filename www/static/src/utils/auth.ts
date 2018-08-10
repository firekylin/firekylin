import { firekylinHistory } from './history';
/**
 * Auth
 */
class Auth {

    token = window.SysConfig.token;

    checkLogin(): boolean {
        const user = window.SysConfig.userInfo;
        if (user.type !== 1) {
            firekylinHistory.replace('/admin/login');
            return false;
        } else {
            return true;
        }
    }
}

export const auth = new Auth();