import React from 'react';
import {cleanup, render, screen, fireEvent, waitFor, act} from '@testing-library/react';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import axios from 'axios';
import {AIContext, AIButton, useEditorAI, reviewChanges} from './ai-editor';
vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
function Harness({store, applyTitle = vi.fn(), applySlug = vi.fn()}: any) {
    const ai = useEditorAI(store, applyTitle, undefined, {type: 0, applySlug});
    return <AIContext.Provider value={ai}><AIButton operation="title" minimum={250} label="AI生成标题" />
        <AIButton operation="review" minimum={100} label="文章审阅" />
        <AIButton operation="translate" minimum={10} label="翻译" /><AIButton operation="slug" minimum={250} label="智能 Slug" />
        <AIButton operation="summary" minimum={250} label="智能生成摘要" /><AIButton operation="category" minimum={250} label="智能分类选择" /><AIButton operation="tags" minimum={250} label="智能标签选择" />{ai.dialogs}</AIContext.Provider>;
}
afterEach(() => { cleanup(); vi.restoreAllMocks() });
beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    window.SysConfig = {csrfToken: 'token'} as any;
    vi.mocked(axios.get).mockResolvedValue({data: {errno: 0, data: {available: true}}});
    vi.spyOn(window, 'alert').mockImplementation(() => {});
});
describe('editor AI interactions', () => {
    it('hides unconfigured AI and disables short content', async() => {
        vi.mocked(axios.get).mockResolvedValueOnce({data: {errno: 0, data: {available: false}}});
        const store = {articleInfo: {markdown_content: ''}, setArticleInfo: vi.fn()};
        const view = render(<Harness store={store} />);
        await act(async() => {});
        expect(screen.queryByRole('button', {name: 'AI生成标题'})).toBeNull();
        view.unmount();
        render(<Harness store={store} />);
        expect(await screen.findByRole('button', {name: 'AI生成标题'})).toBeDisabled();
    });
    it('shows editable title suggestion, resets request state on regeneration failure', async() => {
        const applyTitle = vi.fn();
        vi.mocked(axios.post).mockResolvedValueOnce({data: {errno: 0, data: {text: 'Suggested'}}});
        const store = {articleInfo: {markdown_content: '字'.repeat(251)}, setArticleInfo: vi.fn()};
        render(<Harness store={store} applyTitle={applyTitle} />);
        fireEvent.click(await screen.findByRole('button', {name: 'AI生成标题'}));
        const input = await screen.findByRole('textbox', {name: '建议标题'});
        fireEvent.change(input, {target: {value: 'Edited'}});
        let reject: any;
        vi.mocked(axios.post).mockImplementationOnce(() => new Promise((_, fail) => {reject = fail}));
        fireEvent.click(screen.getByRole('button', {name: '重新生成'}));
        expect(input).toBeDisabled();
        expect(screen.getByRole('button', {name: /使\s*用/})).toBeDisabled();
        await act(async() => {reject(new Error('offline'))});
        expect(window.alert).toHaveBeenCalledWith('offline');
        expect(input).not.toBeDisabled();
        fireEvent.click(screen.getByRole('button', {name: /使\s*用/}));
        expect(applyTitle).toHaveBeenCalledWith('Edited');
    });
    it('requires a decision for changed review blocks and applies accepted result', async() => {
        vi.mocked(axios.post).mockResolvedValueOnce({data: {errno: 0, data: {text: 'New article'}}});
        const store = {articleInfo: {markdown_content: 'a'.repeat(101)}, setArticleInfo: vi.fn()};
        render(<Harness store={store} />);
        fireEvent.click(await screen.findByRole('button', {name: '文章审阅'}));
        const update = await screen.findByRole('button', {name: '更新正文'});
        await screen.findByRole('button', {name: /^接\s*受$/});
        expect(update).toBeDisabled();
        fireEvent.click(screen.getByRole('button', {name: /^接\s*受$/}));
        fireEvent.click(update);
        expect(store.setArticleInfo).toHaveBeenCalledWith({markdown_content: 'New article'});
    });
    it('fills translated body and closes dialog', async() => {
        vi.mocked(axios.post).mockResolvedValueOnce({data: {errno: 0, data: {text: 'Translated'}}});
        const store = {articleInfo: {markdown_content: 'a'.repeat(11)}, setArticleInfo: vi.fn()};
        render(<Harness store={store} />);
        fireEvent.click(await screen.findByRole('button', {name: '翻译'}));
        const buttons = screen.getAllByRole('button', {name: /翻\s*译/});
        fireEvent.click(buttons[buttons.length - 1]);
        await waitFor(() => expect(store.setArticleInfo).toHaveBeenCalledWith({markdown_content: 'Translated'}));
    });
});
describe('review diff', () => {
    it.each([['a\nb\nc\n', 'a\nB\nc\n'], ['', 'new'], ['old', ''], ['same', 'same'], ['a\nb\n', 'a\nx\nb\n']])('preserves both source documents', (before, after) => {
        const changes = reviewChanges(before, after);
        expect(changes.map(c => c.original).join('')).toBe(before);
        expect(changes.map(c => c.proposed).join('')).toBe(after);
    });
});
it('closing review aborts the request and leaves the toolbar icon unchanged', async() => {
    let signal: AbortSignal;
    vi.mocked(axios.post).mockImplementationOnce((url, data, config) => {
        signal = config!.signal as AbortSignal;
        return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('cancelled'))));
    });
    const store = {articleInfo: {markdown_content: '字'.repeat(101)}, setArticleInfo: vi.fn()};
    render(<Harness store={store} />);
    const button = await screen.findByRole('button', {name: '文章审阅'});
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-busy', 'false');
    expect(button.querySelector('.is-loading')).toBeNull();
    await screen.findByRole('status');
    fireEvent.click(screen.getByRole('button', {name: /close/i}));
    await waitFor(() => expect(signal.aborted).toBe(true));
    expect(window.alert).not.toHaveBeenCalled();
    expect(button).not.toBeDisabled();
});
it('reviews an editable Slug and checks uniqueness again when using it', async() => {
    vi.mocked(axios.get).mockResolvedValueOnce({data: {errno: 0, data: {available: true, features: {slug: true}}}});
    vi.mocked(axios.post).mockResolvedValueOnce({data: {errno: 0, data: {text: 'suggested-slug'}}})
        .mockResolvedValueOnce({data: {errno: 0, data: {text: 'edited-slug-2'}}});
    const applySlug = vi.fn();
    render(<Harness store={{articleInfo: {markdown_content: '字'.repeat(251)}, setArticleInfo: vi.fn()}} applySlug={applySlug} />);
    fireEvent.click(await screen.findByRole('button', {name: '智能 Slug'}));
    fireEvent.change(await screen.findByRole('textbox', {name: '建议 Slug'}), {target: {value: 'edited-slug'}});
    fireEvent.click(screen.getByRole('button', {name: /使\s*用/}));
    await waitFor(() => expect(applySlug).toHaveBeenCalledWith('edited-slug-2'));
    expect(axios.post).toHaveBeenLastCalledWith('/admin/api/ai-editor', expect.objectContaining({operation: 'slug', candidate: 'edited-slug'}), expect.anything());
});
it('fills selected categories and tags without a suggestion modal', async() => {
    vi.mocked(axios.get).mockResolvedValueOnce({data: {errno: 0, data: {available: true, features: {category: true}}}});
    vi.mocked(axios.post).mockResolvedValueOnce({data: {errno: 0, data: {text: '[1]', categories: [{id: 1, name: '测试'}]}}})
        .mockResolvedValueOnce({data: {errno: 0, data: {text: '["标签"]', tags: ['标签']}}});
    const store = {articleInfo: {markdown_content: '字'.repeat(251)}, setArticleInfo: vi.fn()};
    render(<Harness store={store} />);
    fireEvent.click(await screen.findByRole('button', {name: '智能分类选择'}));
    await waitFor(() => expect(store.setArticleInfo).toHaveBeenCalledWith({cate: [{id: 1, name: '测试'}]}));
    fireEvent.click(screen.getByRole('button', {name: '智能标签选择'}));
    await waitFor(() => expect(store.setArticleInfo).toHaveBeenCalledWith({tag: ['标签']}));
});
it('AI summary writes only to the existing summary field', async() => {
    vi.mocked(axios.post).mockResolvedValueOnce({data: {errno: 0, data: {text: 'AI 摘要'}}});
    const store = {articleInfo: {markdown_content: '字'.repeat(251)}, setArticleInfo: vi.fn()};
    render(<Harness store={store} />);
    fireEvent.click(await screen.findByRole('button', {name: '智能生成摘要'}));
    await waitFor(() => expect(store.setArticleInfo).toHaveBeenCalledWith({summary: 'AI 摘要', options: {summaryCustomized: true}}));
});
