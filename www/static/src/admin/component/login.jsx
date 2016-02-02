import React from 'react';
import Base from '../../common/component/base';

export default class extends Base {
  /**
   * get two factor auth
   * @return {} []
   */
  getTwoFactor(){
    if(SysConfig.options.two_factor_auth === '1'){
      return (
        <div className="form-group">
          <input type="text" className="form-control" placeholder="二步验证码" name="two_factor_auth" />
        </div>
      );
    }
  }
  render() {
    return (
      <div className="container">
        <div className="row">
            <div className="login">
              <h1 className="text-center">
              <a href="/">{SysConfig.options.title}</a>
              </h1>
              <form role="form" action="/admin/user/login" onsubmit="return false;" method="post">
              <div className="form-group">
                <input type="text" className="form-control" placeholder="用户名" name="username" />
              </div>
              <div className="form-group">
                <input type="password" className="form-control" placeholder="密码" name="password" />
              </div>
              {this.getTwoFactor()}
              <button type="submit" className="btn btn-primary btn-lg btn-block">登录</button>
            </form>
            </div>
        </div>
      </div>
    );
  }
}
