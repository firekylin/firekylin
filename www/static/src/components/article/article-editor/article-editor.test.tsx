import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ArticleEditor } from './article-editor';

vi.mock('../../editor', () => ({
    default: ({ content }: { content: string }) => <div>{content}</div>,
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
});
