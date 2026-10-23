import {useMemo, useState} from 'react';
import {Button, Input, Tag} from 'antd';
import {diffTokens, mergedContent, type ReviewChange} from './diff';
import './review-merge.less';

function Highlight({change, side}: {change: ReviewChange; side: 'original' | 'proposed'}) {
    const edits = useMemo(() => diffTokens(Array.from(change.original), Array.from(change.proposed)), [change.original, change.proposed]);
    const spans: {changed: boolean; text: string}[] = [];
    for (const edit of edits) {
        if (side === 'original' && edit.type === 'insert' || side === 'proposed' && edit.type === 'delete') continue;
        const changed = edit.type !== 'equal', last = spans[spans.length - 1];
        if (last && last.changed === changed) last.text += edit.text;
        else spans.push({changed, text: edit.text});
    }
    return <>{spans.map((span, index) => <span key={index} className={span.changed ? 'review-inline-change' : undefined}>{span.text}</span>)}</>;
}
function LinePair({change}: {change: ReviewChange}) {
    return <div className="review-line-pair">{(['original', 'proposed'] as const).map(side =>
        <div key={side} className={`review-line ${change.unchanged ? '' : change[side] ? side === 'original' ? 'review-removed' : 'review-added' : 'review-empty'}`}>
            <span className="review-line-number">{side === 'original' ? change.originalLine : change.proposedLine}</span>
            <span className="review-line-sign">{change.unchanged || !change[side] ? '' : side === 'original' ? '−' : '+'}</span>
            <pre>{change.unchanged ? change[side] : <Highlight change={change} side={side} />}</pre>
        </div>)}</div>;
}
function ContextLines({rows}: {rows: ReviewChange[]}) {
    const [expanded, setExpanded] = useState(false);
    if (rows.length <= 6 || expanded) return <>{rows.map((row, i) => <LinePair key={i} change={row} />)}</>;
    return <>{rows.slice(0, 3).map((row, i) => <LinePair key={i} change={row} />)}
        <button type="button" className="review-expand-context" onClick={() => setExpanded(true)}>展开 {rows.length - 6} 行未改动内容</button>
        {rows.slice(-3).map((row, i) => <LinePair key={i + rows.length - 3} change={row} />)}</>;
}
function ChangeRow({change, index, number, onChange}: {
    change: ReviewChange; index: number; number: number;
    onChange: (index: number, update: Partial<ReviewChange>) => void;
}) {
    const [editing, setEditing] = useState(false);
    const statuses: Record<string, string> = {accept: '已接受', reject: '已拒绝', edit: '已手动合并'};
    return <section className={`review-change review-change-${change.decision || 'pending'}`} id={`review-change-${number}`}>
        <div className="review-change-actions">
            <span>修改 {number} {change.decision && <Tag>{statuses[change.decision]}</Tag>}</span>
            <div><Button size="small" type={change.decision === 'accept' ? 'primary' : 'link'} onClick={() => onChange(index, {decision: 'accept'})}>接受</Button>
                <Button size="small" type={change.decision === 'reject' ? 'primary' : 'link'} onClick={() => onChange(index, {decision: 'reject'})}>拒绝</Button>
                <Button size="small" type="link" onClick={() => setEditing(value => !value)}>{editing ? '收起编辑' : '手动合并'}</Button>
                {change.decision && <Button size="small" type="link" onClick={() => onChange(index, {decision: ''})}>撤销决定</Button>}</div>
        </div>
        <div className="review-suggestion"><strong>修改建议：</strong>
            {change.reasons?.length ? change.reasons.map((reason, i) => <p key={i}>{reason}</p>)
                : <p>AI 未提供此处修改的具体说明，请结合下方差异审阅。</p>}
        </div>
        <LinePair change={change} />
        {editing && <div className="review-manual-edit"><label htmlFor={`review-edit-${number}`}>合并此处内容（可结合两侧文本编辑）</label>
            <Input.TextArea id={`review-edit-${number}`} autoSize={{minRows: 2, maxRows: 12}} value={change.proposed}
                onChange={event => onChange(index, {proposed: event.target.value, decision: 'edit'})} />
            <small>请保留需要的换行；编辑内容会直接用于合并结果。</small></div>}
    </section>;
}
export default function ReviewMerge({changes, onChange, onDecideAll}: {
    changes: ReviewChange[]; onChange: (index: number, update: Partial<ReviewChange>) => void;
    onDecideAll: (decision: 'accept' | 'reject') => void;
}) {
    const [preview, setPreview] = useState(false), [active, setActive] = useState(-1);
    const changed = changes.filter(change => !change.unchanged);
    const unresolved = changed.filter(change => !change.decision).length;
    const groups: {rows: ReviewChange[]; index: number}[] = [];
    changes.forEach((change, index) => {
        const last = groups[groups.length - 1];
        if (change.unchanged && last?.rows[0].unchanged) last.rows.push(change);
        else groups.push({rows: [change], index});
    });
    const navigate = (offset: number) => {
        setPreview(false);
        const next = active < 0 ? offset < 0 ? changed.length - 1 : 0 : (active + offset + changed.length) % changed.length;
        setActive(next);
        requestAnimationFrame(() => document.getElementById(`review-change-${next + 1}`)?.scrollIntoView({block: 'nearest'}));
    };
    let number = 0;
    return <div className="review-merge"><div className="review-summary">
        <span>{changed.length ? `共 ${changed.length} 处修改，${unresolved} 处待处理` : '审阅完成，没有发现需要修改的内容'}</span>
        <div><Button size="small" disabled={!changed.length} onClick={() => navigate(-1)}>上一处</Button>
            <Button size="small" disabled={!changed.length} onClick={() => navigate(1)}>下一处</Button>
            <Button size="small" disabled={!unresolved} onClick={() => onDecideAll('accept')}>全部接受</Button>
            <Button size="small" disabled={!unresolved} onClick={() => onDecideAll('reject')}>全部拒绝</Button>
            <Button size="small" onClick={() => setPreview(value => !value)}>{preview ? '返回差异对照' : '预览合并结果'}</Button></div>
    </div>{preview ? <div className="review-result"><p>{unresolved ? '待处理修改暂按原文展示，处理全部建议后即可更新正文。' : '以下内容将在点击“更新正文”后回填到编辑器。'}</p>
        <pre>{mergedContent(changes.map(change => !change.unchanged && !change.decision ? {...change, decision: 'reject'} : change))}</pre></div>
        : <div className="review-diff-scroll"><div className="review-column-headings"><strong>原文</strong><strong>AI 建议</strong></div>
            {groups.map(group => group.rows[0].unchanged ? <ContextLines key={group.index} rows={group.rows} />
                : <ChangeRow key={group.index} index={group.index} number={++number} change={group.rows[0]} onChange={onChange} />)}</div>}
    </div>;
}
