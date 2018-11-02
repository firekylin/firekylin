/**
 * Auth
 */
class Auth {

    token = window.SysConfig.token;

    checkLogin(): boolean {
        const user = window.SysConfig.userInfo;
        if (user && user.name) {
            return true;
        }
        return false;
    }
}

export const auth = new Auth();