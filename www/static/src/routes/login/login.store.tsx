import { observable, action } from 'mobx';
import { AppStore } from '../../app.store';
import md5 from 'md5';
import { http } from '../../utils/http';
import { message } from 'antd';

class LoginStore {
  appStore;
  @observable loading = false;
  constructor(appStore: AppStore) {
    this.appStore = appStore;
  }

  @action
  setLoading = data => this.loading = data

  login(values: {username: string, password: string}): void {
    this.setLoading(true);
    values.password = md5(window.SysConfig.options.password_salt + values.password);
    http.post<''>('/admin/user/login', values)
      .subscribe(
        res => {
          if (res.errno === 0) {
            message.success('登陆成功');
            setTimeout(() => { location.reload(); }, 1000);
          } else {
            this.setLoading(false);
          }
        },
        err => {
          message.error(err);
          this.setLoading(false);
        }
      );
  }
}

export default LoginStore;
