import React from 'react';
import {Link} from 'react-router';

import UserBox from './UserBox';


export default class TopBar extends React.Component {
  render() {
    return (
      <div className="TopBar">
        <h1><Link to="dashboard">FireKylin</Link></h1>
        <a className="site-link" href="/" target="_blank"><i className="fa fa-home" />站点</a>
        <UserBox />
      </div>
    )
  }
}