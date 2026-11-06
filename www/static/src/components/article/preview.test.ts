import {afterEach, expect, it, vi} from 'vitest';
import {openArticlePreview} from './preview';
afterEach(() => vi.restoreAllMocks());
it('posts the full article to the public theme and removes the form', () => {
    const data = {id: 3, pathname: 'nested/slug', markdown_content: '# Full article', user: {name: 'Author'}, options: {fields: {color: 'blue'}}};
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function() {
        expect(this.method).toBe('post');
        expect(this.getAttribute('action')).toBe('/post/nested%2Fslug.html?preview=true');
        expect(this.target).toBe('_blank');
        expect(JSON.parse((this.elements.namedItem('previewData') as HTMLInputElement).value)).toEqual(data);
        expect(document.body.contains(this)).toBe(true);
    });
    openArticlePreview(data);
    expect(submit).toHaveBeenCalledOnce();
    expect(document.querySelector('form')).toBeNull();
});
it('removes the preview form even when submission fails', () => {
    vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {throw Error('blocked')});
    expect(() => openArticlePreview({pathname: 'x'}, 1)).toThrow('blocked');
    expect(document.querySelector('form')).toBeNull();
});
