import React from 'react';
import {cleanup, render, screen, fireEvent, waitFor, act} from '@testing-library/react';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import axios from 'axios';
import {AIContext, AIButton, useEditorAI, reviewChanges} from './ai-editor';
vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
function Harness({store, applyTitle = vi.fn()}: any) {
    const ai = useEditorAI(store, applyTitle);
    return <AIContext.Provider value={ai}><AIButton operation="title" minimum={250} label="AI生成标题" />
        <AIButton operation="review" minimum={100} label="文章审阅" />
        <AIButton operation="translate" minimum={10} label="翻译" />{ai.dialogs}</AIContext.Provider>;
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
