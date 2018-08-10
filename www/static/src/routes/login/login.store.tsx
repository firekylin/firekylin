import { observable, action } from 'mobx';
import { AppStore } from '../../app.store';
import md5 from 'md5';
import { http } from '../../utils/http';
import { message } from 'antd';
import { tap } from 'rxjs/operators';

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
      .pipe(
        tap(
          this.setLoading(false),
        )
      )
      .subscribe(
        res => {
          if (res.errno === 0) {
            message.success('登陆成功');
            setTimeout(() => { location.reload(); }, 1000);
          } else {
            message.error(res.errmsg);
          }
        },
        err => {
          message.error(err);
        }
      );
  }
}

export default LoginStore;
