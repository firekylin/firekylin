import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import Sidebar from './sidebar';
import {MemoryRouter} from '../utils/router';
vi.mock('../routes/dashboard/ai-connection-guide', () => ({default: () => null}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    window.SysConfig = {config: {disallow_file_edit: true}, pluginAdmin: [], options: {title: 'Blog'},
        userInfo: {id: 1, name: 'Admin', type: 1}} as any;
});
it('shows three article lists, hides create entries and highlights category pages under articles', () => {
    render(<MemoryRouter initialEntries={['/cate/edit/2']}><Sidebar history={{push: vi.fn()}} /></MemoryRouter>);
    expect(screen.getByRole('link', {name: '文章管理'})).toHaveClass('active');
    expect(screen.getByRole('link', {name: '分类列表'})).toHaveClass('active');
    for (const label of ['分类管理', '标签管理', '添加文章', '添加分类', '添加标签']) {
        expect(screen.queryByRole('link', {name: label})).toBeNull();
    }
    expect(screen.getByRole('link', {name: '标签列表'})).toBeInTheDocument();
});
it('keeps admin-only category/tag/tools menus hidden from authors', () => {
    window.SysConfig.userInfo.type = 2;
    render(<MemoryRouter initialEntries={['/post/list']}><Sidebar history={{push: vi.fn()}} /></MemoryRouter>);
    expect(screen.getByRole('link', {name: '文章列表'})).toBeInTheDocument();
    for (const label of ['分类列表', '标签列表', '管理工具']) expect(screen.queryByRole('link', {name: label})).toBeNull();
});
it('highlights tools with a tool icon and keeps appearance pages intact', () => {
    render(<MemoryRouter initialEntries={['/tools/import']}><Sidebar history={{push: vi.fn()}} /></MemoryRouter>);
    const tools = screen.getByRole('link', {name: /管理工具/});
    expect(tools).toHaveClass('active');
    expect(tools.querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('link', {name: '导入数据'})).toHaveAttribute('href', '/tools/import');
    expect(screen.getAllByRole('link', {name: /管理工具/})).toHaveLength(1);
    expect(screen.getByRole('link', {name: '系统设置'})).not.toHaveClass('active');
});

it('highlights only the install page within plugin management', () => {
    render(<MemoryRouter initialEntries={['/plugin-management/install']}><Sidebar history={{push: vi.fn()}} /></MemoryRouter>);
    expect(screen.getByRole('link', {name: '安装插件'})).toHaveClass('active');
    expect(screen.getByRole('link', {name: '已安装插件'})).not.toHaveClass('active');
});

function renderSidebar(path = '/post/list') {
    return render(<MemoryRouter initialEntries={[path]}><Sidebar history={{push: vi.fn()}} /></MemoryRouter>);
}

it('toggles the icon rail and persists the preference across mounts', () => {
    const view = renderSidebar();
    fireEvent.click(screen.getByRole('button', {name: '收起侧边栏'}));
    expect(screen.getByRole('navigation')).toHaveClass('is-collapsed');
    expect(screen.getByRole('button', {name: '展开侧边栏'})).toHaveAttribute('aria-expanded', 'false');
    expect(localStorage.getItem('firekylin.sidebar.collapsed')).toBe('true');
    view.unmount();
    renderSidebar();
    expect(screen.getByRole('navigation')).toHaveClass('is-collapsed');
    fireEvent.click(screen.getByRole('button', {name: '展开侧边栏'}));
    expect(screen.getByRole('navigation')).not.toHaveClass('is-collapsed');
});

it('opens the flyout on hover and keeps the active child highlighted', async() => {
    localStorage.setItem('firekylin.sidebar.collapsed', 'true');
    renderSidebar('/cate/edit/2');
    const trigger = screen.getByRole('link', {name: '文章管理'});
    expect(trigger).toHaveClass('active');
    fireEvent.mouseEnter(trigger);
    const child = await screen.findByRole('link', {name: '分类列表'});
    expect(child).toHaveClass('active');
    expect(screen.getAllByRole('link', {name: '文章管理'})).toHaveLength(2);
    fireEvent.click(child);
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
});

it('supports focus, touch/click, Escape and excludes hidden inline children from tab order', async() => {
    renderSidebar();
    expect(screen.queryByRole('link', {name: '导入数据'})).toBeNull();
    fireEvent.click(screen.getByRole('button', {name: '收起侧边栏'}));
    const trigger = screen.getByRole('link', {name: '管理工具'});
    fireEvent.focus(trigger);
    const child = await screen.findByRole('link', {name: '导入数据'});
    fireEvent.keyDown(child, {key: 'Escape'});
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'));
});

it('preserves plugin menu permissions and route highlighting in the rail', async() => {
    window.SysConfig.pluginAdmin = [{id: 'demo', panels: [{id: 'main', title: '测试插件'}], pages: [
        {id: 'first', panel: 'main', title: '插件首页'},
        {id: 'second', panel: 'main', title: '插件设置'},
        {id: 'secret', panel: 'main', title: '隐藏页面', menu: false},
    ]}] as any;
    localStorage.setItem('firekylin.sidebar.collapsed', 'true');
    renderSidebar('/plugins/demo/second');
    const trigger = screen.getByRole('link', {name: '测试插件'});
    expect(trigger).toHaveClass('active');
    fireEvent.click(trigger);
    expect(await screen.findByRole('link', {name: '插件设置'})).toHaveClass('active');
    expect(screen.queryByRole('link', {name: '隐藏页面'})).toBeNull();
});

it('keeps commenter navigation restricted when collapsed', () => {
    window.SysConfig.userInfo.type = 4;
    localStorage.setItem('firekylin.sidebar.collapsed', 'true');
    renderSidebar('/comment');
    expect(within(screen.getByRole('navigation')).getAllByRole('link')).toHaveLength(4);
    expect(screen.getByRole('link', {name: '我的评论'})).toHaveClass('active');
    expect(screen.queryByRole('link', {name: '文章管理'})).toBeNull();
});

it('defaults to collapsed on narrow screens when no preference exists', () => {
    const match = vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
        matches: query === '(max-width: 767px)', media: query,
        addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }) as any);
    renderSidebar();
    expect(screen.getByRole('navigation')).toHaveClass('is-collapsed');
    match.mockRestore();
});

it('works when browser storage is unavailable', () => {
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    renderSidebar();
    fireEvent.click(screen.getByRole('button', {name: '收起侧边栏'}));
    expect(screen.getByRole('navigation')).toHaveClass('is-collapsed');
    read.mockRestore();
    write.mockRestore();
});

it('uses a document icon for articles, distinct from comments', () => {
    renderSidebar();
    expect(screen.getByRole('link', {name: '文章管理'}).querySelector('[data-icon="file-text"]')).not.toBeNull();
    expect(screen.getByRole('link', {name: '评论管理'})).toHaveClass('icon-topic');
});

it('keeps long plugin flyouts keyboard accessible and returns Tab to navigation', async() => {
    window.SysConfig.pluginAdmin = [{id: 'long', panels: [{id: 'main', title: '长菜单'}], pages:
        Array.from({length: 30}, (_, i) => ({id: String(i), panel: 'main', title: `页面 ${i}`}))}] as any;
    localStorage.setItem('firekylin.sidebar.collapsed', 'true');
    renderSidebar('/plugins/long/29');
    const trigger = screen.getByRole('link', {name: '长菜单'});
    fireEvent.focus(trigger);
    const last = await screen.findByRole('link', {name: '页面 29'});
    expect(last).toHaveClass('active');
    fireEvent.keyDown(trigger, {key: 'Tab'});
    expect(document.activeElement).toHaveClass('sidebar-popup-title', 'active');
    fireEvent.keyDown(document.activeElement!, {key: 'Tab', shiftKey: true});
    expect(trigger).toHaveFocus();
    fireEvent.keyDown(last, {key: 'Tab'});
    expect(screen.getByRole('button', {name: '展开侧边栏'})).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
});


it('keeps the configured site logo and accessible home link when toggled', () => {
    window.SysConfig.options.logo_url = '/uploads/site-logo.png';
    renderSidebar();
    const home = screen.getByRole('link', {name: 'Blog'});
    const logo = home.querySelector('img')!;
    expect(logo).toHaveAttribute('src', '/uploads/site-logo.png');
    expect(logo).toHaveAttribute('alt', '');
    expect(home).toHaveAttribute('href', '/');
    fireEvent.click(screen.getByRole('button', {name: '收起侧边栏'}));
    expect(screen.getByRole('link', {name: 'Blog'})).toContainElement(logo);
    fireEvent.click(screen.getByRole('button', {name: '展开侧边栏'}));
    expect(home.querySelector('.sidebar-site-title')).toHaveTextContent('Blog');
});

it('uses the bundled logo if no site logo is configured or loading fails', () => {
    const view = renderSidebar();
    expect(screen.getByRole('link', {name: 'Blog'}).querySelector('img')).toHaveAttribute('src', '/static/img/firekylin.jpg');
    view.unmount();
    window.SysConfig.options.logo_url = '/missing.png';
    renderSidebar();
    const logo = screen.getByRole('link', {name: 'Blog'}).querySelector('img')!;
    fireEvent.error(logo);
    expect(logo).toHaveAttribute('src', '/static/img/firekylin.jpg');
    fireEvent.error(logo);
    expect(logo).toHaveAttribute('src', '/static/img/firekylin.jpg');
});
