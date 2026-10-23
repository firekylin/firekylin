import AISparkleIcon from '../ai-sparkle-icon';
import React from 'react';
import axios from 'axios';
import {Button, Checkbox, Input, Modal, Select, Spin, Tooltip} from 'antd';
import {FileSearchOutlined, TranslationOutlined} from '@ant-design/icons';
import './ai-editor.less';
export const AIContext = React.createContext<any>(null);
export function AIButton({operation, minimum, label, icon}: any) {
    const ai = React.useContext(AIContext);
    if (!ai?.available) return null;
    const disabled = [...(ai.content || '')].length <= minimum || ai.busy;
    const tooltip = operation === 'title'
        ? '当正文内容超过 250 个字时可以智能生成标题'
        : operation === 'summary'
            ? disabled ? '当正文内容超过250个字时可以智能生成摘要' : '智能生成摘要'
            : operation === 'review'
                ? disabled ? '当正文内容超过100个字时可以使用智能审阅' : '智能审阅'
                : operation === 'translate'
                    ? disabled ? '当正文内容超过10个字是可以使用智能翻译' : '智能翻译'
                    : label;
    return <Tooltip title={tooltip}>
        <span><Button type="text" className="ai-editor-action" aria-label={label} aria-busy={ai.busy === operation} disabled={disabled}
            icon={ai.busy === operation ? <AISparkleIcon loading /> : icon || <AISparkleIcon />}
            onClick={() => ai.run(operation)} /></span>
    </Tooltip>;
}
export function AIToolbar() {
    return <><li className="tb-btn"><AIButton operation="review" minimum={100} label="文章审阅" icon={<FileSearchOutlined />} /></li>
        <li className="tb-btn"><AIButton operation="translate" minimum={10} label="翻译" icon={<TranslationOutlined />} /></li></>;
}
// Paragraph anchors keep unchanged Markdown outside suggestions and bound comparison cost.
export function reviewChanges(before: string, after: string) {
    const a = before.split(/(?<=\n)/), b = after.split(/(?<=\n)/);
    const result: any[] = [];
    let i = 0, j = 0;
    while (i < a.length || j < b.length) {
        if (i < a.length && j < b.length && a[i] === b[j]) {
            result.push({original: a[i++], proposed: b[j++], unchanged: true}); continue;
        }
        let ai = a.length, bj = b.length, found = false;
        for (let distance = 1; distance < 160 && !found; distance++) {
            for (let offset = 0; offset <= distance; offset++) {
                const x = i + offset, y = j + distance - offset;
                if (x < a.length && y < b.length && a[x] === b[y]) {
                    ai = x; bj = y; found = true; break;
                }
            }
        }
        result.push({original: a.slice(i, ai).join(''), proposed: b.slice(j, bj).join(''), decision: ''});
        i = ai; j = bj;
    }
    return result;
}
export function useEditorAI(store: any, applyTitle: (title: string) => void, scope?: string) {
    const [available, setAvailable] = React.useState(false);
    const [busy, setBusy] = React.useState('');
    const [dialog, setDialog] = React.useState('');
    const [suggestion, setSuggestion] = React.useState('');
    const [language, setLanguage] = React.useState('英语');
    const [translateTitle, setTranslateTitle] = React.useState(false);
    const [changes, setChanges] = React.useState<any[]>([]);
    const pending = React.useRef<AbortController | null>(null);
    React.useEffect(() => {
        setDialog(''); setBusy('');
        return () => pending.current?.abort();
    }, [scope]);
    const snapshot = React.useRef({content: '', title: ''});
    React.useEffect(() => {
        let active = true;
        axios.get('/admin/api/ai-editor').then(res => {
            if (active) setAvailable(res.data.errno === 0 && res.data.data.available);
        }).catch(() => {});
        return () => { active = false };
    }, []);
    const request = async(operation: string) => {
        setBusy(operation);
        const controller = new AbortController();
        pending.current = controller;
        try {
            const res = await axios.post('/admin/api/ai-editor', {operation, ...snapshot.current, language, translateTitle},
                {signal: controller.signal, headers: {'X-CSRF-Token': window.SysConfig.csrfToken}});
            if (res.data.errno !== 0) throw new Error(res.data.errmsg || 'AI 请求失败');
            const {text, title} = res.data.data;
            if (typeof text !== 'string') throw new Error('AI 未返回有效内容');
            if (operation === 'title') { setSuggestion(text); setDialog('title') }
            if (operation === 'summary') store.setArticleInfo({summary: text, options: {customSummary: text}});
            if (operation === 'review') setChanges(reviewChanges(snapshot.current.content, text));
            if (operation === 'translate') {
                if (store.articleInfo.markdown_content !== snapshot.current.content &&
                    !window.confirm('正文已发生变化，是否使用翻译结果覆盖当前正文？')) return;
                store.setArticleInfo({markdown_content: text});
                if (typeof title === 'string') applyTitle(title);
                setDialog('');
            }
        } catch (error: any) {
            if (controller.signal.aborted) return;
            window.alert(error.response?.data?.errmsg || error.message || 'AI 请求失败');
            if (operation === 'review') setDialog('');
        } finally { if (!controller.signal.aborted) setBusy('') }
    };
    const run = (operation: string) => {
        snapshot.current = {content: store.articleInfo.markdown_content || '', title: store.articleInfo.title || ''};
        if (operation === 'translate') { setDialog('translate'); return }
        if (operation === 'review') { setChanges([]); setDialog('review') }
        void request(operation);
    };
    const decide = (index: number, update: any) => setChanges(previous => previous.map((change, i) => i === index ? {...change, ...update} : change));
    const unresolved = changes.some(change => !change.unchanged && !change.decision);
    const applyReview = () => {
        if (store.articleInfo.markdown_content !== snapshot.current.content && !window.confirm('正文已发生变化，是否使用审阅结果覆盖当前正文？')) return;
        store.setArticleInfo({markdown_content: changes.map(change => change.unchanged || change.decision === 'reject' ? change.original : change.proposed).join('')});
        setDialog('');
    };
    const dialogs = <>
        <Modal title="标题建议" open={dialog === 'title'} onCancel={() => setDialog('')} closable={!busy} keyboard={!busy} mask={{closable: !busy}} footer={[
            <Button key="regenerate" disabled={!!busy} aria-busy={busy === 'title'} icon={<AISparkleIcon loading={busy === 'title'} />} onClick={() => request('title')}>重新生成</Button>,
            <Button key="use" type="primary" disabled={!!busy || !suggestion.trim()} onClick={() => {applyTitle(suggestion); setDialog('')}}>使用</Button>
        ]}>
            <p>请审阅编辑该标题，觉得不合适可以尝试重新生成。</p>
            <Input aria-label="建议标题" value={suggestion} disabled={!!busy} onChange={e => setSuggestion(e.target.value)} />
        </Modal>
        <Modal title="翻译文章" open={dialog === 'translate'} onCancel={() => setDialog('')} closable={!busy} keyboard={!busy} mask={{closable: !busy}}
            footer={<><Button disabled={!!busy} onClick={() => setDialog('')}>取消</Button><Button type="primary" disabled={!!busy} aria-busy={busy === 'translate'} icon={<AISparkleIcon loading={busy === 'translate'} />} onClick={() => request('translate')}>翻译</Button></>}>
            <p>翻译为</p><Select aria-label="目标语言" style={{width: '100%'}} value={language} disabled={!!busy} onChange={setLanguage}
                options={[
                    {value: '英语', label: 'English'},
                    {value: '简体中文', label: '简体中文'},
                    {value: '繁体中文', label: '繁體中文'},
                    {value: '日语', label: '日本語'},
                    {value: '韩语', label: '한국어'},
                    {value: '法语', label: 'Français'},
                    {value: '德语', label: 'Deutsch'},
                    {value: '西班牙语', label: 'Español'},
                ]} />
            <p><Checkbox checked={translateTitle} disabled={!!busy} onChange={e => setTranslateTitle(e.target.checked)}>同步翻译标题</Checkbox></p>
        </Modal>
        <Modal title="文章审阅" width={1000} open={dialog === 'review'} onCancel={() => setDialog('')} closable={!busy} keyboard={!busy} mask={{closable: !busy}}
            footer={<Button type="primary" disabled={!!busy || unresolved || !changes.length} onClick={applyReview}>更新正文</Button>}>
            {busy === 'review' ? <Spin description="正在审阅文章…" /> : <>
                {unresolved && <p>还有未处理的建议： <Button onClick={() => setChanges(c => c.map(x => x.unchanged || x.decision ? x : {...x, decision: 'accept'}))}>全部接受</Button> <Button onClick={() => setChanges(c => c.map(x => x.unchanged || x.decision ? x : {...x, decision: 'reject'}))}>全部拒绝</Button></p>}
                <div className="ai-review">{changes.map((change, index) => change.unchanged ? <pre key={index}>{change.original}</pre> :
                    <section key={index}><div className="ai-review-columns"><pre className="removed">{change.original || '（新增）'}</pre><div className="added"><Input.TextArea aria-label={`修改建议 ${index + 1}`} autoSize value={change.proposed} onChange={e => decide(index, {proposed: e.target.value, decision: 'edit'})} /></div></div>
                        <Button type={change.decision === 'accept' ? 'primary' : 'default'} onClick={() => decide(index, {decision: 'accept'})}>接受</Button> <Button type={change.decision === 'reject' ? 'primary' : 'default'} onClick={() => decide(index, {decision: 'reject'})}>拒绝</Button> {change.decision === 'edit' && '已手动合并'}</section>)}</div>
            </>}
        </Modal>
    </>;
    return {available, busy, run, content: store.articleInfo.markdown_content, dialogs};
}
