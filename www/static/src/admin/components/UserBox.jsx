import React from 'react';

import BaseComponent from './BaseComponent';
import UserActions from '../actions/UserActions';

export default class UserBox extends BaseComponent {
  render() {
    let userInfo = this.props.userInfo;
    return (
      <div className="UserBox">
        <span>你好，{ userInfo.nickname || userInfo.username }</span>
        <a href="javascript:void(0);" onClick={ this.handleExit }>退出</a>
      </div>
    )
  }
  handleExit(e) {
    e.preventDefault();
    UserActions.logout();
  }
}