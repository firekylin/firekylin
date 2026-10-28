import {fireEvent, render} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import ArticleControlPublic from './control-public';

describe('content visibility', () => {
    it('allows selecting password protection for a page', () => {
        const change = vi.fn();
        const view = render(<ArticleControlPublic isPublic="1" allowPassword handlePublicChange={change} />);
        fireEvent.click(view.getByRole('radio', {name: '密码访问'}));
        expect(change).toHaveBeenCalled();
    });
});
