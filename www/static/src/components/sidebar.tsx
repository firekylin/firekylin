import * as React from 'react';
import { NavLink, useLocation } from '../utils/router';
import { InitiateRoutes, InitiateThemePages } from './data/routes.data';

function createSidebarState() {
    const themePages = [...InitiateThemePages];
    if (!window.SysConfig.config.disallow_file_edit) {
        themePages.push({url: '/appearance/edit', title: '编辑主题'});
    }
    const pluginRoutes = (window.SysConfig.pluginAdmin || []).reduce(
        (routes, plugin) => routes.concat(plugin.panels
            .filter(panel => plugin.pages.some(page => page.panel === panel.id && page.menu !== false))
            .map(panel => {
                const pages = plugin.pages.filter(page => page.panel === panel.id && page.menu !== false);
                return {
                    url: `/plugins/${plugin.id}/${pages[0].id}`,
                    icon: panel.icon || 'plugin',
                    title: panel.title,
                    type: 1,
                    children: pages.length > 1 ? pages.map(page => ({
                        url: `/plugins/${plugin.id}/${page.id}`,
                        title: page.title,
                    })) : undefined,
                };
            })),
        [],
    );
    return {routes: [...InitiateRoutes(themePages), ...pluginRoutes], isActive: {}};
}
function SideBar(props: any) {
    const {pathname} = useLocation();
    const [state, setState] = React.useState(createSidebarState);
    const legacyRef = React.useRef({});
    const legacy = legacyRef.current as any;
    legacy.state = state;
    legacy.setState = (update: any, callback?: () => void) => {
        setState((previous: any) => {
            const next = {
                ...previous,
                ...(typeof update === 'function' ? update(previous, props) : update),
            };
            legacy.state = next;
            return next;
        });
        if (callback) queueMicrotask(callback);
    };
    if (!legacy.__initialized) {
        legacy.__initialized = true;
    }
    legacy.initState = function initState() {
        const themePages = [...InitiateThemePages];
        if (!window.SysConfig.config.disallow_file_edit) {
            themePages.push({ url: '/appearance/edit', title: '编辑主题' });
        }

        const pluginRoutes = (window.SysConfig.pluginAdmin || []).reduce(
            (routes, plugin) =>
                routes.concat(
                    plugin.panels
                        .filter((panel) =>
                            plugin.pages.some(
                                (page) => page.panel === panel.id && page.menu !== false,
                            ),
                        )
                        .map((panel) => {
                            const pages = plugin.pages.filter(
                                (page) => page.panel === panel.id && page.menu !== false,
                            );
                            return {
                                url: `/plugins/${plugin.id}/${pages[0].id}`,
                                icon: panel.icon || 'plugin',
                                title: panel.title,
                                type: 1,
                                children:
                                    pages.length > 1
                                        ? pages.map((page) => ({
                                              url: `/plugins/${plugin.id}/${page.id}`,
                                              title: page.title,
                                          }))
                                        : undefined,
                            };
                        }),
                ),
            [],
        );
        return {
            routes: [...InitiateRoutes(themePages), ...pluginRoutes],
            isActive: {},
        };
    };
    legacy.isActive = function isActive(routeUrl: string): boolean {
        const currentPath = pathname.replace(/^\/admin(?=\/|$)/, '');
        return currentPath === routeUrl || currentPath.startsWith(`${routeUrl}/`);
    };
    legacy.isRouteActive = function isRouteActive(route: any): boolean {
        return (route.activePaths || [route.url]).some(path => legacy.isActive(path));
    };
    legacy.isSectionActive = function isSectionActive(route: any): boolean {
        return legacy.isRouteActive(route) || Boolean(route.children?.some(child => legacy.isRouteActive(child)));
    };
    legacy.open = function open(routeUrl: string) {
        props.history.push(routeUrl);
    };
    legacy.render = function render() {
        let routes = legacy.state.routes;
        let userType = window.SysConfig.userInfo.type || 0;
        if (userType === 4) {
            routes = [
                { url: '/comment', icon: 'topic', title: '我的评论' },
                {
                    url: `/user/edit/${window.SysConfig.userInfo.id}`,
                    icon: 'user',
                    title: '账号设置',
                },
                { url: '/user/edit_pwd', icon: 'setting', title: '修改密码' },
            ];
        } else {
            routes = routes.filter(item => !item.type || userType <= item.type);
        }
        routes = routes.map(route => ({...route, children: route.children?.filter(child =>
            child.menu !== false && (!child.type || userType <= child.type))}));
        return (
            <div className="fk-side ps-container" id="fk-side">
                <div className="mod">
                    <div className="mod-logo">
                        <h1>
                            <a href="/">{window.SysConfig.options.title}</a>
                        </h1>
                    </div>
                </div>
                <ul className="mod-bar" style={{ marginTop: 10 }}>
                    <input type="hidden" id="hide_values" value="0" />
                    {routes.map((route, i) => (
                        <li key={i}>
                            <NavLink
                                to={route.url}
                                onClick={() => legacy.open(route.url)}
                                className={`icon ${typeof route.icon === 'string' ? `icon-${route.icon}` : ''} ${route.children && legacy.isSectionActive(route) ? 'active' : ''}`}
                                activeClassName="active"
                            >
                                {route.icon && typeof route.icon !== 'string' ? React.createElement(route.icon, {
                                    style: {display: 'inline-block', width: 35, fontSize: 16, verticalAlign: 'middle'},
                                }) : null}
                                <span>{route.title}</span>
                            </NavLink>
                            {route.children ? (
                                <ul
                                    style={{
                                        height:
                                            49 *
                                            (legacy.isSectionActive(route)
                                                ? route.children.length
                                                : 0),
                                    }}
                                >
                                    {route.children.map((child, j) => (
                                        <li key={j}>
                                            <NavLink
                                                to={child.url}
                                                onClick={() => legacy.open(child.url)}
                                                className={legacy.isRouteActive(child) ? 'active' : ''}
                                                activeClassName="active"
                                            >
                                                <span>{child.title}</span>
                                            </NavLink>
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </li>
                    ))}
                </ul>
            </div>
        );
    };
    return legacy.render();
}

export default SideBar;
