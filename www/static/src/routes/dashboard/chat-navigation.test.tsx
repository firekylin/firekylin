import React from 'react';
import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {of} from 'rxjs';
import {MemoryRouter, Route, Switch} from '../../utils/router';
import {Provider} from '../../utils/mobx-react';
import {ToolResult} from './chat-content';
import PostCreate from '../post/create/create';
import ArticleStore from '../../components/article/article.store';
import SharedStore from '../../shared.store';
import PostStore from '../post/post.store';
import UserStore from '../user/user.store';
import {http} from '../../utils/http';
vi.mock('../../utils/http', () => ({http: {get: vi.fn(), post: vi.fn()}}));
beforeEach(() => {
    window.SysConfig = {config: {}, options: {theme: 'firekylin'}, userInfo: {id: 1, type: 1}} as any;
    vi.stubGlobal('ResizeObserver', class {observe() {} unobserve() {} disconnect() {}});
    vi.mocked(http.post).mockReturnValue(of({errno: 0, data: '<p>正文</p>'}) as any);
    vi.mocked(http.get).mockImplementation((url: string) => of({errno: 0, data:
        url.includes('/post/3') ? {id: 3, title: '聊天里的草稿', markdown_content: '正文', tag: [], cate: [], is_public: 1, options: {}} :
        url.includes('/api/user') ? {data: [], count: 0, currentPage: 1, pageSize: 100, totalPages: 0} :
        url.includes('defaultCategory') ? '' : []}) as any);
});
afterEach(() => {cleanup(); vi.unstubAllGlobals()});
it('opens the real editor directly from chat without visiting the post list', async() => {
    render(<Provider postStore={new PostStore({} as any)} articleStore={new ArticleStore()} sharedStore={new SharedStore()} userStore={new UserStore({} as any)}>
        <MemoryRouter initialEntries={['/dashboard']}><Switch>
            <Route path="/dashboard" render={() => <ToolResult entry={{name: 'posts.get_managed', content: JSON.stringify({id: 3, title: '草稿'})}} />} />
            <Route path="/post/edit/:id" component={PostCreate} />
        </Switch></MemoryRouter>
    </Provider>);
    fireEvent.click(screen.getByRole('link', {name: '修改内容'}));
    expect(await screen.findByDisplayValue('正文')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('聊天里的草稿')).toBeInTheDocument();
});
