import * as React from 'react';
import { NavLink } from '../utils/router';
import { InitiateRoutes, InitiateThemePages } from './data/routes.data';
class SideBar extends React.Component<any, any> {
    state = this.initState();
    
    constructor(props: any) {
        super(props);
    }

    initState() {
        const themePages = [...InitiateThemePages];
        if (!window.SysConfig.config.disallow_file_edit) {
            themePages.push({url: '/appearance/edit', title: '编辑主题'});
        }

        const pluginRoutes = (window.SysConfig.pluginAdmin || []).reduce((routes, plugin) =>
            routes.concat(plugin.panels.filter(panel =>
                plugin.pages.some(page => page.panel === panel.id)
            ).map(panel => {
                const pages = plugin.pages.filter(page => page.panel === panel.id);
                return {
                    url: `/plugins/${plugin.id}/${pages[0].id}`,
                    icon: panel.icon || 'plugin',
                    title: panel.title,
                    type: 1,
                    children: pages.length > 1 ? pages.map(page => ({
                        url: `/plugins/${plugin.id}/${page.id}`,
                        title: page.title
                    })) : undefined
                };
            })), []);
        return {
            routes: [...InitiateRoutes(themePages), ...pluginRoutes],
            isActive: {}
        };
    }
    isActive(routeUrl: string): boolean {
        const currentPath = location.pathname.replace(/^\/admin(?=\/|$)/, '');
        return currentPath === routeUrl || currentPath.startsWith(`${routeUrl}/`);
    }
    open(routeUrl: string) {
        this.props.history.push(routeUrl);
    }

    render() {
        let routes = this.state.routes;
        let userType = window.SysConfig.userInfo.type || 0;
        if (userType === 4) {
            routes = [
                {url: '/comment', icon: 'topic', title: '我的评论'},
                {url: `/user/edit/${window.SysConfig.userInfo.id}`, icon: 'user', title: '账号设置'},
                {url: '/user/edit_pwd', icon: 'setting', title: '修改密码'},
            ];
        } else {
            routes = routes.filter(item => {
                if (!item.type) {
                    return true;
                }
                if (userType <= item.type) {
                    return true;
                }
            });
        }
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
                            <NavLink to={route.url} onClick={() => this.open(route.url)}
                                className={`icon icon-${route.icon} ${route.children && route.children.some(child =>
                                    this.isActive(child.url)) ? 'active' : ''}`}
                                activeClassName="active"
                            >
                                <span>{route.title}</span>
                            </NavLink>
                            {
                                route.children 
                                ?
                                    <ul style={{height: 49 * (route.children.some(child =>
                                        this.isActive(child.url)) ? route.children.length : 0)}}>
                                        {route.children.map((child, j) =>
                                        <li key={j}>
                                            <NavLink to={child.url} onClick={() => this.open(child.url)}
                                                activeClassName="active">
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
