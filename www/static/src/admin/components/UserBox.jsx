import React from 'react';

export default class UserBox extends React.Component {
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