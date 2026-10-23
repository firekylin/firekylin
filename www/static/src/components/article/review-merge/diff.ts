export type Edit = {type: 'equal' | 'delete' | 'insert'; text: string};
export interface ReviewChange {
    original: string;
    proposed: string;
    originalLine?: number;
    proposedLine?: number;
    unchanged?: boolean;
    decision?: '' | 'accept' | 'reject' | 'edit';
}

// Myers shortest-edit path, bounded to keep unrelated documents responsive.
export function diffTokens(a: string[], b: string[]): Edit[] {
    let prefix = 0, suffix = 0;
    while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
    while (suffix < a.length - prefix && suffix < b.length - prefix &&
        a[a.length - suffix - 1] === b[b.length - suffix - 1]) suffix++;
    const left = a.slice(prefix, a.length - suffix), right = b.slice(prefix, b.length - suffix);
    const start: Edit[] = a.slice(0, prefix).map(text => ({type: 'equal', text}));
    const end: Edit[] = a.slice(a.length - suffix).map(text => ({type: 'equal', text}));
    const frontier = new Map<number, number>([[1, 0]]);
    const trace: Map<number, number>[] = [];
    for (let distance = 0; distance <= left.length + right.length && distance <= 800; distance++) {
        trace.push(new Map(frontier));
        for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
            let x = diagonal === -distance || (diagonal !== distance &&
                (frontier.get(diagonal - 1) ?? -1) < (frontier.get(diagonal + 1) ?? -1))
                ? frontier.get(diagonal + 1) ?? 0 : (frontier.get(diagonal - 1) ?? 0) + 1;
            let y = x - diagonal;
            while (x < left.length && y < right.length && left[x] === right[y]) { x++; y++ }
            frontier.set(diagonal, x);
            if (x < left.length || y < right.length) continue;
            const edits: Edit[] = [];
            for (let d = distance; d >= 0; d--) {
                const v = trace[d], k = x - y;
                const previousK = k === -d || (k !== d &&
                    (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1)) ? k + 1 : k - 1;
                const previousX = v.get(previousK) ?? 0, previousY = previousX - previousK;
                while (x > previousX && y > previousY) {
                    edits.push({type: 'equal', text: left[--x]}); y--;
                }
                if (d > 0) {
                    if (x === previousX) edits.push({type: 'insert', text: right[--y]});
                    else edits.push({type: 'delete', text: left[--x]});
                }
            }
            return [...start, ...edits.reverse(), ...end];
        }
    }
    return [...start, ...left.map(text => ({type: 'delete' as const, text})),
        ...right.map(text => ({type: 'insert' as const, text})), ...end];
}

export function reviewChanges(before: string, after: string): ReviewChange[] {
    const lines = (text: string) => text.match(/[^\n]*\n|[^\n]+$/g) || [];
    const edits = diffTokens(lines(before), lines(after));
    const changes: ReviewChange[] = [];
    let originalLine = 1, proposedLine = 1, index = 0;
    while (index < edits.length) {
        if (edits[index].type === 'equal') {
            const text = edits[index++].text;
            changes.push({original: text, proposed: text, originalLine: originalLine++, proposedLine: proposedLine++, unchanged: true});
            continue;
        }
        const removed: string[] = [], added: string[] = [];
        while (index < edits.length && edits[index].type !== 'equal') {
            const edit = edits[index++];
            (edit.type === 'delete' ? removed : added).push(edit.text);
        }
        for (let row = 0; row < Math.max(removed.length, added.length); row++) {
            changes.push({original: removed[row] ?? '', proposed: added[row] ?? '',
                originalLine: row < removed.length ? originalLine++ : undefined,
                proposedLine: row < added.length ? proposedLine++ : undefined, decision: ''});
        }
    }
    return changes;
}
export function mergedContent(changes: ReviewChange[]) {
    return changes.map(change => change.unchanged || change.decision === 'reject' ? change.original : change.proposed).join('');
}
