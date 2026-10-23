import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {of} from 'rxjs';
import {MemoryRouter} from '../../../utils/router';
import PostList from './list';
import CategoryList from '../../category/list/list';
import {TagList} from '../../tag/list/list';
vi.mock('../../../utils/mobx-react', () => ({inject: () => (component: any) => component, observer: (component: any) => component}));
vi.mock('./table/list-table', () => ({default: () => null}));
vi.mock('../../../components/breadcrumb', () => ({default: ({actions}: any) => <header>{actions}</header>}));
vi.mock('../../tag/tag.api', () => ({TagAPI: {queryTagList: () => of([])}}));
afterEach(cleanup);
beforeEach(() => {vi.stubGlobal('ResizeObserver', class {observe() {} unobserve() {} disconnect() {}}); window.SysConfig = {userInfo: {type: 1}} as any});
it.each([
    [PostList, '添加文章', '/post/create'],
    [CategoryList, '添加分类', '/cate/create'],
    [TagList, '添加标签', '/tag/create'],
] as const)('places the create action in the list rather than navigation', (Component, title, target) => {
    const push = vi.fn();
    const sharedStore = {categoryList: [], tagList: [], loading: {}, defaultCategory: '',
        getCategoryList: vi.fn(), getDefaultCategory: vi.fn(), getTagList: vi.fn(),
        getUserList: () => of({errno: 0, data: []}), setUserList: vi.fn()};
    const postStore = {selectedRowKeys: [], plReqParams: {}, getPostList: vi.fn()};
    render(<MemoryRouter><Component {...({history: {push}, sharedStore, postStore, categoryStore: {}} as any)} /></MemoryRouter>);
    const button = screen.getByRole('button', {name: title});
    expect(button.closest('header')).toBeNull();
    expect(button.closest(target === '/post/create' ? '.forms' : '.list-toolbar')).not.toBeNull();
    fireEvent.click(button);
    expect(push).toHaveBeenCalledWith(target);
});
