import * as React from 'react';
import { NavLink, match, matchPath } from 'react-router-dom';
import { InitiateRoutes, InitiateThemePages } from './data/routes.data';
class SideBar extends React.Component<any, any> {
    state = this.initState();
    
    constructor(props: any) {
        super(props);
    }

    initState() {
        const themePages = InitiateThemePages;
        if (!window.SysConfig.config.disallow_file_edit) {
            themePages.push({url: '/appearance/edit', title: '编辑主题'});
        }

        return {
            routes: InitiateRoutes(themePages),
            isActive: {}
        };
    }
    isActive(routeUrl: string): boolean {
        return `/${location.pathname.split('/')[2]}`.includes(routeUrl);
    }
    open(routeUrl: string) {
        this.props.history.push(routeUrl);
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
                            <NavLink to={route.url} onClick={() => this.open(route.children && route.children[0].url || route.url)}
                                className={`icon icon-${route.icon}`}
                                activeClassName="active"
                            >
                                <span>{route.title}</span>
                            </NavLink>
                            {
                                route.children 
                                ?
                                    <ul style={{height: 49 * (this.isActive(route.url) ? route.children.length : 0)}}>
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