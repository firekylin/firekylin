import React from 'react';

import BaseComponent from './BaseComponent';

export default class UserBox extends BaseComponent {
  render() {
    return (
      <div className="UserBox">
        <span>你好，jed</span>
        <a href="javascript:;" onClick={this.handleExit}>退出</a>
      </div>
    )
  }
  handleExit() {

  }
}