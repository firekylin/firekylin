import Reflux from 'reflux';
import md5 from 'md5';
import request from 'superagent';


import UserActions from '../actions/UserActions';
import AlertActions from '../actions/AlertActions';
import apiHelper from '../utils/WebAPIHelper';


let UserStatusStore = apiHelper('/admin/api/session', UserActions, {
  onLogin(username, password, captcha, autoLogin) {
    password = md5(`~!@#$${password}$#@!~`);
    request
        .post(this.getUrl())
        .type('form')
        .send({username, password, captcha, autoLogin})
        .end(this.callback(UserActions.login));
  },
  onLogout() {
    request
        .del(this.getUrl())
        .end(this.callback(UserActions.logout));
  },
  onCheck() {
    request
        .get(this.getUrl())
        .end(this.callback(UserActions.check));
  },
  onModifyPsw(password, newPassword) {
    password = md5(`~!@#$${password}$#@!~`);
    newPassword = md5(`~!@#$${newPassword}$#@!~`);
    request
      .put(this.getUrl())
      .type('form')
      .send({password, newPassword})
      .end(this.callback(UserActions.modifyPsw));
  }
});

let UserStore = Reflux.createStore({

  listenables: UserActions,

  onLoginCompleted(response) {
    AlertActions.success('登录成功');
    this.trigger(response.data);
  },

  onLoginFailed(error) {
    AlertActions.warning(error);
    this.trigger(null);
  },

  onLogoutCompleted(response) {
    AlertActions.success('退出成功');
    this.trigger(null);
  },

  onCheckCompleted(response) {
    this.trigger(response.data);
  },

  onCheckFailed(error) {
    this.trigger(null);
  },

  onShowLogin() {
    this.trigger(null);
  }

});


export { UserStore, UserStatusStore };
