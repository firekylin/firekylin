import {useState} from 'react';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import ReviewMerge from './review-merge';
import {reviewChanges} from './diff';
afterEach(cleanup);
function Harness() {
    const [changes, setChanges] = useState(() => reviewChanges('这是一篇好的文章。\n另一行\n', '这是一篇优秀的文章。\n另一行\n', [{originalLine: 1, proposedLine: 1, reason: '用更准确的形容词改善表达'}]));
    return <ReviewMerge changes={changes} onChange={(index, update) => setChanges(previous => previous.map((c, i) => i === index ? {...c, ...update} : c))}
        onDecideAll={decision => setChanges(previous => previous.map(c => c.unchanged || c.decision ? c : {...c, decision}))} />;
}
describe('review merge interactions', () => {
    it('highlights precise edits and previews manually merged content', () => {
        vi.stubGlobal('ResizeObserver', class {observe() {} unobserve() {} disconnect() {}});
        const {container} = render(<Harness />);
        expect(screen.getByText('用更准确的形容词改善表达')).toBeInTheDocument();
        expect(container.querySelector('.review-removed .review-inline-change')).toHaveTextContent('好');
        expect(container.querySelector('.review-added .review-inline-change')).toHaveTextContent('优秀');
        fireEvent.click(screen.getByRole('button', {name: '手动合并'}));
        fireEvent.change(screen.getByRole('textbox'), {target: {value: '我自己的版本。\n'}});
        expect(screen.getByText('已手动合并')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: '预览合并结果'}));
        expect(container.querySelector('.review-result pre')?.textContent).toBe('我自己的版本。\n另一行\n');
    });
    it('rejects a change and permits undoing the decision', () => {
        render(<Harness />);
        fireEvent.click(screen.getByRole('button', {name: /^拒\s*绝$/}));
        expect(screen.getByText('已拒绝')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: '撤销决定'}));
        expect(screen.getByText('共 1 处修改，1 处待处理')).toBeInTheDocument();
    });
});
