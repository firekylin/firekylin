import * as React from 'react';
import { NavLink } from 'react-router-dom';
import classnames from 'classnames';
import { SideBarItem } from './types/routes.model';
import { InitiateRoutes } from './data/routes.data';
import { firekylinHistory } from '../utils/history';

class SideBar extends React.Component<any, any> {
  state = this.initState();
  
  constructor(props: any) {
    super(props);
  }

  initState(): {routes: SideBarItem[]} {
    const themePages = [
      {url: '/appearance/theme', title: '主题管理'},
      {url: '/appearance/navigation', title: '菜单管理'}
    ];
    if (!window.SysConfig.config.disallow_file_edit) {
      themePages.push({url: '/appearance/edit', title: '编辑主题'});
    }

    return {
      routes: InitiateRoutes(themePages)
    };
  }
  /**
   * 是否是高亮状态
   * @param  {[type]}  routeUrl [description]
   * @return {Boolean}          [description]
   */
  isActive(routeUrl: string): boolean {
    return firekylinHistory.location.pathname.includes(routeUrl);
  }
  getClassName(icon: string | undefined, routeUrl: string) {
    let active = this.isActive(routeUrl);
    return classnames({
      icon: true,
      [`icon-${icon}`]: true,
      active: active
    });
  }
  // getSubUlClassName(routeUrl){
  //   if(this.isActive(routeUrl)){
  //     return 'block';
  //   }
  //   return 'hide';
  // }
  getSubLinkClassName(routeUrl: string) {
    return classnames({
      active: this.isActive(routeUrl)
    });
  }
  open(routeUrl: string) {
    firekylinHistory.push(routeUrl);
  }

  render() {
    let routes = this.state.routes;
    let userType = window.SysConfig.userInfo.type || 0;
    routes = routes.filter(item => {
      if (!item.type) {
        return true;
      }
      if (userType <= item.type) {
        return true;
      }
    });
    return (
      <div className="fk-side ps-container" id="fk-side">
        <div className="mod">
          <div className="mod-logo">
            <h1><a href="/">{window.SysConfig.options.title}</a></h1>
          </div>
        </div>
        <ul className="mod-bar" style={{marginTop: 10}}>
          <input type="hidden" id="hide_values" value="0" />
          {routes.map((route, i) =>
            <li key={i}>
              {
                route.children 
                ?
                  <a onClick={() => this.open(route.children && route.children[0].url || route.url)}
                  className={this.getClassName(route.icon, route.url)}
                  >
                    <span>{route.title}</span>
                  </a>
                :
                  <NavLink to={route.url} onClick={() => this.open(route.children && route.children[0].url || route.url)}
                  className={this.getClassName(route.icon, route.url)}
                  >
                    <span>{route.title}</span>
                  </NavLink>
              }
              {
                route.children 
                ?
                  <ul style={{height: 49 * (this.isActive(route.url) ? route.children.length : 0)}}>
                    {route.children.map((child, j) =>
                      <li key={j}>
                        <NavLink to={child.url} onClick={this.open.bind(this, child.url)}
                          className={this.getSubLinkClassName(child.url)}>
                          <span>{child.title}</span>
                        </NavLink>
                      </li>
                    )}
                  </ul>
                :
                  null
              }
            </li>
          )}
        </ul>
      </div>
    );
  }
}

export default SideBar;