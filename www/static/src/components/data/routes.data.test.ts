import {describe, expect, it} from 'vitest';
import {InitiateRoutes} from './routes.data';
describe('smart content settings navigation', () => {
    it('lists smart content under system settings only when the plugin page is available', () => {
        window.SysConfig = {pluginAdmin: [{id: 'ai-content', pages: [{id: 'settings', menu: false}]}]} as any;
        const options = InitiateRoutes([]).find(route => route.url === '/options')!;
        expect(options.children).toContainEqual({url: '/options/smart-content', title: '智能内容'});
        window.SysConfig = {pluginAdmin: []} as any;
        expect(InitiateRoutes([]).find(route => route.url === '/options')!.children)
            .not.toContainEqual({url: '/options/smart-content', title: '智能内容'});
    });
});
