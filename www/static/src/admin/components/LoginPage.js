import React from 'react';
import autobind from 'autobind-decorator';

import BaseComponent from './BaseComponent';


@autobind
class LoginPage extends BaseComponent {

  componentDidMount() {

    this.subscribe(
    );
  }

  render() {
    return (
        <div className="LoginPage">
          <div className="main">
            <div className="login-box">
              <p>
                <label htmlFor="username">用户名</label>
                <input id="username" type="text"/>
              </p>
              <p>
                <label htmlFor="password">密码</label>
                <input id="password" type="password"/>
              </p>
            </div>
            <p className="copyright">2015 &copy; Firekylin v0.0.1</p>
          </div>
        </div>
    )
  }

  onChange(data) {
  }
}

export default LoginPage;