import React from 'react';
import {Link} from 'react-router';
import {State as RouterState} from 'react-router';
import {decorate as mixin} from 'react-mixin';

import BaseComponent from './BaseComponent';


@mixin(RouterState)
class Navigation extends BaseComponent {
  render() {
    let getClassName = function(name, path) {
      path = path === undefined ? name : path;
      let routers = this.getRoutes();
      let pathname = routers[2].path.substr(routers[1].path.length);
      return pathname.startsWith(path + '/') || pathname == path ?
          `${name} active` : name;
    }.bind(this);
    return (
      <ul className="Navigation">
        <li className={getClassName('dashboard', '')}><Link to="dashboard"><i className="fa fa-dashboard" />仪表盘</Link></li>
        <li className={getClassName('post')}><Link to="post"><i className="fa fa-files-o" />文章管理</Link></li>
        <li className={getClassName('category')}><Link to="category"><i className="fa fa-list" />分类管理</Link></li>
        {/*<li className={getClassName('tag')}><Link to="dashboard"><i className="fa fa-tags" />标签管理</Link></li>*/}
        {/*<li className={getClassName('tag')}><Link to="dashboard"><i className="fa fa-tags" />链接管理</Link></li>*/}
        <li className={getClassName('user')}><Link to="dashboard"><i className="fa fa-users" />用户管理</Link></li>
        <li className={getClassName('setting')}><Link to="setting"><i className="fa fa-wrench" />系统设置</Link></li>
      </ul>
    )
  }
}

export default Navigation