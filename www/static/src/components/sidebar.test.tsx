import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import Sidebar from './sidebar';
import {MemoryRouter} from '../utils/router';
vi.mock('../routes/dashboard/ai-connection-guide', () => ({default: () => null}));
afterEach(cleanup);
beforeEach(() => {
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
