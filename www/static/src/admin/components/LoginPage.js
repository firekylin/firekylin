import React from 'react';
import autobind from 'autobind-decorator';
import { History } from 'react-router';
import { decorate as mixin } from 'react-mixin';

import BaseComponent from './BaseComponent';
import Alert from './Alert';
import UserActions from '../actions/UserActions';
import AlertActions from '../actions/AlertActions';
import { UserStore } from '../stores/UserStores';


@autobind
@mixin(History)
class LoginPage extends BaseComponent {

  constructor(props) {
    super(props);

    this.useCaptcha = false;
  }

  componentDidMount() {
    UserActions.check();

    this.subscribe(
        UserStore.listen(this.onUserChange)
    );
  }

  render() {

    let captcha = this.useCaptcha ? (
        <p>
          <label className="label" htmlFor="captcha">验证码：</label>
          <input id="captcha" className="txt short" type="text" ref="captcha" />
          <img src={this.getCaptchaUrl()} onClick={this.changeCaptcha} />
        </p>
    ) : '';

    return (
      <div className="LoginPage">
        <Alert />
        <div className="main">
          <h1>Fire Kylin</h1>
          <div className="login-box">
            <form onSubmit={this.handleSubmit}>
            <p>
              <label className="label" htmlFor="username">用户名：</label>
              <input id="username" className="txt" type="text" ref="username" />
            </p>
            <p>
              <label className="label" htmlFor="password">密码：</label>
              <input id="password" className="txt" type="password" ref="password" />
            </p>
            <p>
              <label className="auto-login"><input className="checkbox" type="checkbox" ref="autoLogin"/>下次自动登录</label>
              <a className="forget-password" href="#" onClick={this.handleForgetPassword}>忘记密码?</a>
            </p>
            <p className="button-wrapper">
              <button type="submit" className="button lightblue">提交</button>
            </p>
            </form>
          </div>
          <p className="copyright">2015 &copy; Firekylin v0.0.1</p>
        </div>
      </div>
    )
  }

  onUserChange(userInfo) {
    if (userInfo) {
      this.history.replaceState({}, '/admin');
    }
  }

  handleSubmit(e) {
    e.preventDefault();
    let username = this.refs.username.getDOMNode().value;
    let password = this.refs.password.getDOMNode().value;
    let autoLogin = this.refs.autoLogin.getDOMNode().checked;
    let captcha = this.useCaptcha ? this.refs.captcha.getDOMNode().value : '';

    let error = [
      { check: username, name: '用户名' },
      { check: password, name: '密码' },
      { check: !this.useCaptcha || captcha, name: '验证码' }
    ].some(field => {
      if (!field.check) {
        AlertActions.warning(`${field.name}不能为空！`);
        return true;
      }
    });

    if (!error) {
      UserActions.login(username, password, captcha, autoLogin);
    }
  }

  handleForgetPassword(e) {
    e.preventDefault();
  }
}

export default LoginPage;