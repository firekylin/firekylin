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
        </div>
    )
  }

  onChange(data) {
  }
}

export default LoginPage;