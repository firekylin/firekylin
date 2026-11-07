import * as React from 'react';
import {Popover} from 'antd';
import {MenuFoldOutlined, MenuUnfoldOutlined} from '@ant-design/icons';
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
const STORAGE_KEY = 'firekylin.sidebar.collapsed';
const DEFAULT_LOGO = '/static/img/firekylin.jpg';

function SidebarEntry({route, collapsed, pathname}: any) {
    const [open, setOpen] = React.useState(false);
    const trigger = React.useRef<HTMLAnchorElement>(null);
    const popup = React.useRef<HTMLDivElement>(null);
    const restoringFocus = React.useRef(false);
    const id = React.useId();
    const currentPath = pathname.replace(/^\/admin(?=\/|$)/, '');
    const isActive = (item: any) => (item.activePaths || [item.url]).some((path: string) =>
        currentPath === path || currentPath.startsWith(`${path}/`));
    const active = isActive(route) || route.children?.some(isActive);
    React.useEffect(() => { setOpen(false); }, [pathname, collapsed]);
    React.useEffect(() => {
        if (!open) return;
        const outside = (event: PointerEvent) => {
            const target = event.target as Node;
            if (!trigger.current?.contains(target) && !popup.current?.contains(target)) setOpen(false);
        };
        document.addEventListener('pointerdown', outside);
        return () => document.removeEventListener('pointerdown', outside);
    }, [open]);
    const navigatePopup = (event: React.KeyboardEvent) => {
        const links = popup.current?.querySelectorAll<HTMLAnchorElement>('a');
        if (!links?.length) return;
        if (event.key === 'Tab' && event.shiftKey && event.target === links[0]) {
            event.preventDefault();
            trigger.current?.focus();
        } else if (event.key === 'Tab' && !event.shiftKey && event.target === links[links.length - 1]) {
            event.preventDefault();
            const next = trigger.current?.closest('li')?.nextElementSibling?.querySelector<HTMLAnchorElement>('a');
            (next || document.querySelector<HTMLButtonElement>('.sidebar-footer button'))?.focus();
            setOpen(false);
        }
    };
    const dismiss = (event: React.KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        restoringFocus.current = true;
        trigger.current?.focus();
        restoringFocus.current = false;
    };
    const blur = (event: React.FocusEvent) => {
        const target = event.relatedTarget as Node | null;
        if (!event.currentTarget.contains(target) && !popup.current?.contains(target)) setOpen(false);
    };
    const children = route.children?.length ? (
        <ul className="sidebar-children" hidden={!collapsed && !active}>
            {route.children.map((child: any) => (
                <li key={child.url}>
                    <NavLink to={child.url} end={child.url === route.url}
                        onClick={() => setOpen(false)}
                        className={(child.url === route.url ? currentPath === child.url : isActive(child)) ? 'active' : ''}
                        activeClassName="active">{child.title}</NavLink>
                </li>
            ))}
        </ul>
    ) : null;
    const link = (
        <NavLink to={route.url} aria-label={route.title}
            aria-expanded={collapsed ? open : undefined} aria-controls={collapsed && open ? id : undefined}
            onFocus={() => { if (collapsed && !restoringFocus.current) setOpen(true); }}
            onKeyDown={event => {
                if (collapsed && open && ((event.key === 'Tab' && !event.shiftKey) || event.key === 'ArrowRight' || event.key === 'ArrowDown')) {
                    const first = popup.current?.querySelector<HTMLAnchorElement>('a');
                    if (first) { event.preventDefault(); first.focus(); }
                }
            }}
            onClick={event => {
                if (collapsed && route.children?.length && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                    event.preventDefault();
                    setOpen(true);
                } else setOpen(false);
            }}
            ref={trigger}
            className={`icon ${typeof route.icon === 'string' ? `icon-${route.icon}` : ''} ${active ? 'active' : ''}`}
            activeClassName="active">
            {route.icon && typeof route.icon !== 'string' ? React.createElement(route.icon, {
                'aria-hidden': true,
                style: {display: 'inline-block', width: 35, fontSize: 16, verticalAlign: 'middle'},
            }) : null}
            <span className="sidebar-label">{route.title}</span>
        </NavLink>
    );
    return (
        <li onKeyDown={dismiss} onBlur={blur}>
            {collapsed ? <Popover placement="rightTop" arrow={false} align={{offset: [0, 0], overflow: {adjustX: false, adjustY: false, shiftY: true}}} trigger={['hover']}
                open={open} onOpenChange={setOpen} mouseLeaveDelay={0.15}
                classNames={{root: 'sidebar-popover'}}
                content={<div className="sidebar-flyout" id={id} ref={popup} onKeyDown={event => { dismiss(event); navigatePopup(event); }}>
                    <NavLink className={`sidebar-popup-title${active ? ' active' : ''}`} to={route.url} onClick={() => setOpen(false)}>{route.title}</NavLink>
                    {children}
                </div>}>
                {link}
            </Popover> : link}
            {!collapsed && children}
        </li>
    );
}

function SideBar(_props: any) {
    const {pathname} = useLocation();
    const [state] = React.useState(createSidebarState);
    const [collapsed, setCollapsed] = React.useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved !== null) return saved === 'true';
        } catch { /* Storage can be disabled in private browsers. */ }
        return window.matchMedia('(max-width: 767px)').matches;
    });
    const toggle = () => {
        setCollapsed(previous => {
            try { localStorage.setItem(STORAGE_KEY, String(!previous)); } catch { /* Keep the control usable. */ }
            return !previous;
        });
    };
    const userType = window.SysConfig.userInfo.type || 0;
    let routes: any[] = userType === 4 ? [
        {url: '/comment', icon: 'topic', title: '我的评论'},
        {url: `/user/edit/${window.SysConfig.userInfo.id}`, icon: 'user', title: '账号设置'},
        {url: '/user/edit_pwd', icon: 'setting', title: '修改密码'},
    ] : state.routes.filter(item => !item.type || userType <= item.type);
    routes = routes.map(route => ({...route, children: route.children?.filter((child: any) =>
        child.menu !== false && (!child.type || userType <= child.type))}));
    return (
        <nav className={`fk-side ps-container${collapsed ? ' is-collapsed' : ''}`} id="fk-side" aria-label="后台导航">
            <div className="sidebar-scroll">
                <div className="mod"><div className="mod-logo"><h1>
                    <a href="/" aria-label={window.SysConfig.options.title}>
                        <img hidden={!collapsed} src={window.SysConfig.options.logo_url || DEFAULT_LOGO} alt=""
                            onError={event => {
                                if (event.currentTarget.getAttribute('src') !== DEFAULT_LOGO) {
                                    event.currentTarget.src = DEFAULT_LOGO;
                                }
                            }} />
                        <span hidden={collapsed} className="sidebar-site-title">{window.SysConfig.options.title}</span>
                    </a>
                </h1></div></div>
                <ul className="mod-bar" id="sidebar-menu">
                    {routes.map(route => <SidebarEntry key={route.url} route={route} collapsed={collapsed} pathname={pathname} />)}
                </ul>
            </div>
            <div className="sidebar-footer">
                <button type="button" onClick={toggle} aria-expanded={!collapsed} aria-controls="sidebar-menu"
                    aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'} title={collapsed ? '展开侧边栏' : '收起侧边栏'}>
                    {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                </button>
            </div>
        </nav>
    );
}

export default SideBar;
