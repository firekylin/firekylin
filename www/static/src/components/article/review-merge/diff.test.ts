import {describe, expect, it} from 'vitest';
import {diffTokens, reviewChanges, mergedContent} from './diff';

describe('review diff accuracy', () => {
    it.each([
        ['', ''], ['', 'new'], ['old', ''], ['same', 'same'],
        ['one\ntwo\nthree\n', 'one\nnew\nthree\n'],
        ['a\nb\n', 'a\nx\nb\n'], ['a\nx\nb\n', 'a\nb\n'],
        ['a\na\nb\na\n', 'a\nb\nb\na\n'],
        ['中文内容🙂\n\n```js\na()\n```', '中文文章🙂\n\n```js\nb()\n```'],
        ['a\r\nb\r\n', 'a\r\nB\r\n'], ['last\n', 'last'],
    ])('reconstructs both documents and preserves every newline', (before, after) => {
        const changes = reviewChanges(before, after);
        expect(changes.map(change => change.original).join('')).toBe(before);
        expect(changes.map(change => change.proposed).join('')).toBe(after);
        expect(mergedContent(changes.map(change => ({...change, decision: 'reject'})))).toBe(before);
        expect(mergedContent(changes.map(change => ({...change, decision: 'accept'})))).toBe(after);
    });
    it('isolates character edits inside Chinese sentences', () => {
        const edits = diffTokens(Array.from('这是一篇好的文章。'), Array.from('这是一篇优秀的文章。'));
        expect(edits.filter(edit => edit.type === 'delete').map(edit => edit.text).join('')).toBe('好');
        expect(edits.filter(edit => edit.type === 'insert').map(edit => edit.text).join('')).toBe('优秀');
    });
    it('tracks added and deleted line numbers and mixed decisions', () => {
        const changes = reviewChanges('one\ntwo\nthree\n', 'one\nTWO\nTHREE\nnew\n');
        expect(changes[1]).toMatchObject({originalLine: 2, proposedLine: 2});
        expect(changes[3]).toMatchObject({original: '', proposedLine: 4});
        changes[1].decision = 'reject';
        changes[2] = {...changes[2], decision: 'edit', proposed: 'manual\n'};
        changes[3].decision = 'accept';
        expect(mergedContent(changes)).toBe('one\ntwo\nmanual\nnew\n');
    });
    it('reconstructs randomized repeated-token inputs', () => {
        let seed = 17;
        const random = () => { seed = (seed * 16807) % 2147483647; return seed };
        for (let run = 0; run < 200; run++) {
            const make = () => Array.from({length: random() % 30}, () => String(random() % 5));
            const a = make(), b = make();
            const edits = diffTokens(a, b);
            expect(edits.filter(edit => edit.type !== 'insert').map(edit => edit.text)).toEqual(a);
            expect(edits.filter(edit => edit.type !== 'delete').map(edit => edit.text)).toEqual(b);
        }
    });
});
