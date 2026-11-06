import React from 'react';
import {render, screen, cleanup, fireEvent} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {DashBoard} from './dashboard';
import {MemoryRouter} from '../../utils/router';
import {InitiateRoutes} from '../../components/data/routes.data';
vi.mock('../../components/breadcrumb', () => ({default: () => <nav>后台导航</nav>}));
vi.mock('./chat', () => ({default: ({children, onConversationChange}: any) => {
    const [active, setActive] = React.useState(false);
    return <section aria-label="聊天"><button onClick={() => {setActive(true); onConversationChange?.(true)}}>开始聊天</button>{!active && children}</section>;
}}));
afterEach(cleanup);
function overview(type: number) {
    window.SysConfig = {userInfo: {type}} as any;
    const props = {dashBoardStore: {systemInfo: {count: {posts: 12, comments: 8, cates: 3},
        versions: {platform: 'Linux', needUpdate: '2.18.0'}}, posts: [{id: 1, title: '已有文章', create_time: '2026-11-05', pathname: 'existing'}],
        getSelectLast: vi.fn(), getSystemInfo: vi.fn()}, sharedStore: {}} as any;
    return render(<MemoryRouter initialEntries={['/dashboard']}><DashBoard {...props} /></MemoryRouter>);
}
it('administrator sees embedded chat instead of website summary, with existing lower sections and upgrade notice', async() => {
    overview(1);
    expect(await screen.findByRole('region', {name: '聊天'})).toBeInTheDocument();
    expect(screen.queryByText('网站概要')).not.toBeInTheDocument();
    expect(screen.queryByText('点击下面的链接快速开始:')).not.toBeInTheDocument();
    for (const text of ['最近发布的文章', '系统概况', '关于我们', '已有文章']) {
        expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByRole('link', {name: '在线更新'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: '开始聊天'}));
    expect(screen.queryByText('系统概况')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', {name: '在线更新'})).not.toBeInTheDocument();
});
it('non-administrator retains original summary, counts and permitted quick links without chat', () => {
    overview(2);
    expect(screen.getByText('网站概要')).toBeInTheDocument();
    expect(screen.getByText(/目前有 12 篇文章/)).toBeInTheDocument();
    expect(screen.getByRole('link', {name: '撰写新文章'})).toBeInTheDocument();
    expect(screen.queryByRole('link', {name: '系统设置'})).not.toBeInTheDocument();
    expect(screen.queryByRole('region', {name: '聊天'})).not.toBeInTheDocument();
    expect(screen.getByText('系统概况')).toBeInTheDocument();
});
it('sidebar has a single overview entry and no dedicated assistant page', () => {
    const routes = InitiateRoutes([]);
    expect(routes.filter(route => route.url === '/dashboard')).toHaveLength(1);
    expect(routes.find(route => route.url === '/dashboard')?.title).toBe('站点概览');
    expect(routes.some(route => route.url === '/overview' || route.title === '博客助手')).toBe(false);
});
