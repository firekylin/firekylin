import React from 'react';
import autobind from 'autobind-decorator';

import BaseComponent from './BaseComponent';


@autobind
class UserPage extends BaseComponent {

  componentDidMount() {

    this.subscribe(
    );
  }

  render() {
    return (
        <div className="UserPage page">
          <div className="title">
            <h2>用户管理</h2>
          </div>
        </div>
    )
  }

  onChange(data) {
  }
}

export default UserPage;