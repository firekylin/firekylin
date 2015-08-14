import React from 'react';
import {Link} from 'react-router';

import BaseComponent from './BaseComponent';
import UserBox from './UserBox';


export default class TopBar extends BaseComponent {
  render() {
    return (
      <div className="TopBar">
        <h1><Link to="dashboard">FireKylin</Link></h1>
        <a className="site-link" href="/" target="_blank"><i className="fa fa-home" />站点</a>
        <UserBox userInfo={ this.props.userInfo }/>
      </div>
    )
  }
}