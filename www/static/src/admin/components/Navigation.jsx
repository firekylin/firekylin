import React from 'react';
import {Link} from 'react-router';
import {State as RouterState} from 'react-router';
import {decorate as mixin} from 'react-mixin';


@mixin(RouterState)
class Navigation extends React.Component {
  render() {
    let getClassName = function(name) {
      let routers = this.getRoutes();
      let pathname = routers[2].path.substr(routers[1].path.length);
      return pathname.startsWith(name + '/') || pathname == name ?
          `${name} active` : name;
    }.bind(this);
    return (
      <ul className="Navigation">
        <li className={getClassName('post')}><Link to="post"><i className="fa fa-file-o" />文章</Link></li>
        <li className={getClassName('category')}><Link to="category"><i className="fa fa-files-o" />分类</Link></li>
      </ul>
    )
  }
}

export default Navigation