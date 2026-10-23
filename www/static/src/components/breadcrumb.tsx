import classnames from 'classnames';
import { Link, useLocation } from '../utils/router';
import * as React from 'react';
import { SideBarItem } from './types/routes.model';
import { InitiateRoutes } from './data/routes.data';
import AIConnectionGuide from '../routes/dashboard/ai-connection-guide';

interface BreadCrumbState {
    userOpen: boolean;
    crumb: SideBarItem[];
}
function BreadCrumb(props: any) {
    const location = useLocation();
    const [state, setState] = React.useState(() => ({
        userOpen: false,
        crumb: [],
    }));
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

        const themePages = [
            { url: '/appearance/theme', title: '主题管理' },
            { url: '/appearance/navigation', title: '菜单管理' },
        ];

        if (!window.SysConfig.config.disallow_file_edit) {
            themePages.push({ url: '/appearance/edit', title: '编辑主题' });
        }

        const InitiatedRoutes = InitiateRoutes(themePages);
        legacy.crumbs = {};
        InitiatedRoutes.forEach((route) => {
            if (!route.children) {
                return;
            }
            route.children.forEach((child) => {
                legacy.crumbs[child.url] = [
                    { title: route.title, url: route.url, children: route.children },
                    child,
                ];
            });
        });

        if (legacy.crumbs[location.pathname]) {
            legacy.state.crumb = legacy.crumbs[location.pathname];
        }
    }
    legacy.onMount = function onMount() {
        document.addEventListener('click', legacy.bindHandleDocumentClick, false);
    };
    legacy.onUnmount = function onUnmount() {
        document.removeEventListener('click', legacy.bindHandleDocumentClick, false);
    };
    legacy.handleDocumentClick = function handleDocumentClick(event: MouseEvent) {
        if (!(legacy.userInfoRef as HTMLUListElement).contains(event.target as Node)) {
            legacy.setState({
                userOpen: false,
            });
        }
    };
    if (!legacy.bindHandleDocumentClick) {
        legacy.bindHandleDocumentClick = legacy.handleDocumentClick.bind(null);
    }
    legacy.toggleUser = function toggleUser() {
        legacy.setState({
            userOpen: !legacy.state.userOpen,
        });
    };
    legacy.getUserClass = function getUserClass() {
        return classnames({
            dropdown: true,
            open: legacy.state.userOpen,
        });
    };
    legacy.render = function render() {
        let breadcrumb;
        if (legacy.state.crumb.length > 0) {
            breadcrumb = (
                <ol className="breadcrumb">
                    <li>
                        <Link to="/dashboard">首页</Link>
                    </li>
                    {legacy.state.crumb.map((item, i) => {
                        if (item.url === location.pathname) {
                            return (
                                <li key={i} className="active">
                                    {item.title}
                                </li>
                            );
                        }
                        return (
                            <li key={i}>
                                <Link
                                    to={item.children ? item.children[0].url : item.url}
                                >
                                    {item.title}
                                </Link>
                            </li>
                        );
                    })}
                </ol>
            );
        } else {
            breadcrumb = (
                <ol className="breadcrumb">
                    <li>首页</li>
                </ol>
            );
        }
        return (
            <div className="fk-header clearfix">
                <div className="pull-left">{breadcrumb}</div>
                <ul
                    className="nav navbar-nav navbar-right userinfo"
                    ref={(ul) => (legacy.userInfoRef = ul)}
                >
                    <li><AIConnectionGuide /></li>
                    <li className={legacy.getUserClass()}>
                        <a
                            onClick={() => legacy.toggleUser()}
                            className="dropdown-toggle"
                            data-toggle="dropdown"
                        >
                            {window.SysConfig.userInfo.name} <b className="caret" />
                        </a>
                        <ul className="dropdown-menu">
                            <li>
                                <Link to={`/user/edit/${window.SysConfig.userInfo.id}`}>
                                    账号设置
                                </Link>
                            </li>
                            <li>
                                <Link to="/user/edit_pwd">修改密码</Link>
                            </li>
                            <li>
                                <a href="/admin/user/logout">退出</a>
                            </li>
                        </ul>
                    </li>
                </ul>
            </div>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
        return () => legacy.onUnmount();
    }, []);
    return legacy.render();
}

export default BreadCrumb;
