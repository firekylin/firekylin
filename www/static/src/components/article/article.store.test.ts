import {expect, it, vi} from 'vitest';
import {of} from 'rxjs';
import {http} from '../../utils/http';
import ArticleStore from './article.store';
vi.mock('../../utils/http', () => ({http: {get: vi.fn(), post: vi.fn()}}));
function article(options: Record<string, unknown>) {
    return {id: 1, summary: 'stored summary', title: 'Title', markdown_content: 'body', create_time: '2026-10-23 12:00:00',
        is_public: 1, tag: [], cate: [], options};
}
it('loads the summary field and resets it when starting another article', () => {
    vi.mocked(http.get).mockReturnValueOnce(of({errno: 0, data: article({})}) as any);
    const store = new ArticleStore();
    store.getArticleInfoById(1, 0);
    expect(store.articleInfo.summary).toBe('stored summary');
    store.resetArticleInfo();
    expect(store.articleInfo.summary).toBe('');
});
it('does not carry page attachments into another page', () => {
    const store = new ArticleStore();
    store.setArticleInfo({options: {attachmentIds: [42]}});
    store.resetArticleInfo();
    expect(store.articleInfo.options.attachmentIds).toEqual([]);
    store.setArticleInfo({options: {attachmentIds: [42]}});
    vi.mocked(http.get).mockReturnValueOnce(of({errno: 0, data: article({})}) as any);
    store.getArticleInfoById(1, 1);
    expect(store.articleInfo.options.attachmentIds).toEqual([]);
});
it('tracks concurrent uploads independently and clears them on navigation', () => {
    const store = new ArticleStore();
    const first = Symbol('first'); const second = Symbol('second');
    store.setUploadPending(first, true); store.setUploadPending(first, true); store.setUploadPending(second, true);
    expect(store.pendingUploads.size).toBe(2);
    store.setUploadPending(first, false);
    expect(store.pendingUploads.size).toBe(1);
    store.resetArticleInfo();
    expect(store.pendingUploads.size).toBe(0);
    store.setUploadPending(second, false);
    expect(store.pendingUploads.size).toBe(0);
});
