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
