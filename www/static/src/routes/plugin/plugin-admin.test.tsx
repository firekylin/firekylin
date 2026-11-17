import {act, fireEvent, render, waitFor} from '@testing-library/react';
import {of, Subject, throwError} from 'rxjs';
import {message} from 'antd';
import {beforeEach, expect, it, vi} from 'vitest';
import {http} from '../../utils/http';
import PluginAdmin from './plugin-admin';

vi.mock('../../utils/http', () => ({http: {get: vi.fn(), post: vi.fn()}}));
vi.mock('../../components/breadcrumb', () => ({default: () => null}));
vi.mock('../../components/protocol/page-section', () => ({
    PAGE_SECTION_CONTENT_INSET: 0,
    hasLayoutReferences: () => true,
    ActionGroup: () => null,
    PageForm: () => null,
    PageSections: ({context}: any) => <div>{context.forms.map((form: any) =>
        <button key={form.id} onClick={() => context.submit(form.id, {value: 'updated'})}>
            {form.title}: {context.formValues[form.id]?.value}
        </button>)}</div>
}));

const props = (pageId = 'settings', search = '') => ({match: {params: {pluginId: 'say', pageId}},
    location: {search, pathname: `/plugins/say/${pageId}`}});
const response = (title = 'Settings') => ({errno: 0, data: {
    page: {id: 'settings', title}, content: {sections: []}, actions: [],
    forms: ['basic', 'external', 'wecom', 'wechat', 'feishu'].map(id => ({id, title: id})),
    formValues: {feishu: {value: 'saved'}}
}});

beforeEach(() => {
    window.SysConfig = {csrfToken: 'token', pluginAdmin: []} as any;
    vi.spyOn(message, 'success').mockImplementation(() => undefined as any);
    vi.mocked(http.get).mockReturnValue(of(response()) as any);
    vi.mocked(http.post).mockReturnValue(of({errno: 0, data: {}}) as any);
});

it('loads five forms in one request using live descriptors even if the bootstrap manifest is stale', () => {
    const view = render(<PluginAdmin {...props('settings', '?id=42&includeForms=0')} />);
    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.get).toHaveBeenCalledWith('/admin/api/plugins/say/pages/settings?id=42&includeForms=1');
    expect(view.getByRole('button', {name: 'feishu: saved'})).toBeInTheDocument();
    expect(view.getAllByRole('button')).toHaveLength(5);
});

it('keeps per-form saves and refreshes the bundled values after success', async() => {
    const view = render(<PluginAdmin {...props()} />);
    fireEvent.click(view.getByRole('button', {name: 'feishu: saved'}));
    expect(http.post).toHaveBeenCalledWith('/admin/api/plugins/say/forms/feishu', {value: 'updated'},
        {headers: {'X-CSRF-Token': 'token'}});
    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
    expect(vi.mocked(http.get).mock.calls.every(([url]) => url.includes('/pages/settings?'))).toBe(true);
});

it('unsubscribes old page loads on navigation and on unmount', () => {
    const first = new Subject<any>();
    const second = new Subject<any>();
    vi.mocked(http.get).mockReturnValueOnce(first).mockReturnValueOnce(second);
    const view = render(<PluginAdmin {...props('settings')} />);
    view.rerender(<PluginAdmin {...props('edit', '?id=7')} />);
    expect(first.observed).toBe(false);
    act(() => {
        second.next(response('Edit'));
        first.next(response('Obsolete'));
    });
    expect(view.getByText('Edit')).toBeInTheDocument();
    expect(view.queryByText('Obsolete')).not.toBeInTheDocument();
    expect(http.get).toHaveBeenLastCalledWith('/admin/api/plugins/say/pages/edit?id=7&includeForms=1');
    view.unmount();
    expect(second.observed).toBe(false);
});

it.each(['business', 'network'])('does not expose empty writable forms after a %s load error and supports retry', kind => {
    vi.mocked(http.get).mockReturnValueOnce((kind === 'business'
        ? of({errno: 404, errmsg: 'Not available'}) : throwError(() => new Error('Not available'))) as any);
    const view = render(<PluginAdmin {...props()} />);
    expect(view.getByText('Not available')).toBeInTheDocument();
    expect(view.queryByRole('button', {name: 'feishu: saved'})).not.toBeInTheDocument();
    fireEvent.click(view.getByRole('button', {name: /重\s*试/}));
    expect(view.getByRole('button', {name: 'feishu: saved'})).toBeInTheDocument();
});
