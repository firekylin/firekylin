import {describe, expect, it} from 'vitest';
import {InitiateRoutes} from './routes.data';
describe('smart content settings navigation', () => {
    it('lists smart content under system settings without any plugin', () => {
        window.SysConfig = {pluginAdmin: [{id: 'ai-content', pages: [{id: 'settings', menu: false}]}]} as any;
        const options = InitiateRoutes([]).find(route => route.url === '/options')!;
        expect(options.children).toContainEqual({url: '/options/smart-content', title: '智能内容'});
        window.SysConfig = {pluginAdmin: []} as any;
        expect(InitiateRoutes([]).find(route => route.url === '/options')!.children)
            .toContainEqual({url: '/options/smart-content', title: '智能内容'});
    });
});

it('groups article, category and tag lists and keeps creation routes out of menus', () => {
    const routes = InitiateRoutes([]);
    const posts = routes.find(route => route.url === '/post')!;
    expect(posts.children.filter(child => child.menu !== false).map(child => child.url))
        .toEqual(['/post/list', '/cate/list', '/tag/list']);
    expect(routes.some(route => ['/cate', '/tag'].includes(route.url))).toBe(false);
});
it('places tools after system settings and removes tool pages from settings', () => {
    const routes = InitiateRoutes([]);
    const index = routes.findIndex(route => route.url === '/options');
    expect(routes[index + 1].title).toBe('管理工具');
    expect(routes[index + 1].children.map(child => child.url)).toEqual(['/tools/ai-logs', '/tools/import', '/tools/export']);
    expect(routes[index].children.some(child => ['/options/ai-logs', '/options/import', '/options/export'].includes(child.url))).toBe(false);
});
