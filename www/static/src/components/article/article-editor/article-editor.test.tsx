import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ArticleEditor } from './article-editor';

const pending = vi.hoisted(() => ({callback: undefined as undefined | ((id: number) => void)}));
vi.mock('../../editor', () => ({
    default: ({ content, onAttachment }: { content: string; onAttachment?: (id: number) => void }) => {
        pending.callback = onAttachment;
        return <div>{content}{onAttachment && <button onClick={() => onAttachment(42)}>uploaded</button>}</div>;
    },
}));
vi.mock('../../../utils/http', () => ({http: {post: vi.fn()}}));

describe('ArticleEditor', () => {
    it('settles after content updates and can be unmounted during navigation', () => {
        window.SysConfig = {pluginAdmin: []} as any;
        const articleStore = {
            articleInfo: { markdown_content: 'first draft' },
            setArticleInfo: vi.fn(),
        };
        const props = {
            id: undefined,
            type: 0,
            articleStore,
            postStore: { postList: [], setPlReqParams: vi.fn() },
        };

        const view = render(<ArticleEditor {...props} />);
        expect(view.getByText('first draft')).toBeInTheDocument();

        articleStore.articleInfo.markdown_content = 'updated draft';
        view.rerender(<ArticleEditor {...props} />);
        expect(view.getByText('updated draft')).toBeInTheDocument();
        expect(() => view.unmount()).not.toThrow();
    });
    it('records uploaded page attachments without replacing existing IDs', () => {
        window.SysConfig = {pluginAdmin: []} as any;
        const articleStore = {
            articleInfo: {markdown_content: 'page', options: {attachmentIds: [7]}},
            setArticleInfo: vi.fn(),
        };
        const view = render(<ArticleEditor id={undefined} type={1} articleStore={articleStore}
            postStore={{postList: [], setPlReqParams: vi.fn()}} />);
        fireEvent.click(view.getByText('uploaded'));
        expect(articleStore.setArticleInfo).toHaveBeenCalledWith({options: {attachmentIds: [7, 42]}});
    });
    it('ignores an upload that completes after leaving the page', () => {
        const articleStore = {articleInfo: {markdown_content: 'page', options: {attachmentIds: []}}, setArticleInfo: vi.fn()};
        const view = render(<ArticleEditor id="1" type={1} articleStore={articleStore}
            postStore={{postList: [], setPlReqParams: vi.fn()}} />);
        const callback = pending.callback;
        view.unmount();
        callback?.(42);
        expect(articleStore.setArticleInfo).not.toHaveBeenCalled();
    });
});
