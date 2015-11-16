import React from 'react';
import autobind from 'autobind-decorator';

import BaseComponent from './BaseComponent';


@autobind
class UserInfo extends BaseComponent {

  componentDidMount() {

    this.subscribe(
    );
  }

  render() {
    return (
        <div className="UserInfo page">
          <div className="title">
            <h2>个人管理</h2>
          </div>
          <div>
            <button>修改密码</button>
          </div>
        </div>
    )
  }

  onChange(data) {
  }
}

export default UserPage;