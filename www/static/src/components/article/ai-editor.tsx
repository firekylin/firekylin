import ReviewMerge from './review-merge/review-merge';
import {reviewChanges, mergedContent} from './review-merge/diff';
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
        <span><Button type="text" className="ai-editor-action" aria-label={label} aria-busy={operation !== 'review' && ai.busy === operation} disabled={disabled}
            icon={operation !== 'review' && ai.busy === operation ? <AISparkleIcon loading /> : icon || <AISparkleIcon />}
            onClick={() => ai.run(operation)} /></span>
    </Tooltip>;
}
export function AIToolbar() {
    return <><li className="tb-btn"><AIButton operation="review" minimum={100} label="文章审阅" icon={<FileSearchOutlined />} /></li>
        <li className="tb-btn"><AIButton operation="translate" minimum={10} label="翻译" icon={<TranslationOutlined />} /></li></>;
}
export {reviewChanges} from './review-merge/diff';
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
            if (controller.signal.aborted) return;
            if (res.data.errno !== 0) throw new Error(res.data.errmsg || 'AI 请求失败');
            const {text, title, suggestions} = res.data.data;
            if (typeof text !== 'string') throw new Error('AI 未返回有效内容');
            if (operation === 'title') { setSuggestion(text); setDialog('title') }
            if (operation === 'summary') store.setArticleInfo({summary: text, options: {customSummary: text}});
            if (operation === 'review') setChanges(reviewChanges(snapshot.current.content, text, suggestions));
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
    const closeReview = () => {
        pending.current?.abort();
        setBusy('');
        setDialog('');
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
        store.setArticleInfo({markdown_content: mergedContent(changes)});
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
            <p>翻译为</p><Select showSearch optionFilterProp="label" aria-label="目标语言" style={{width: '100%'}} value={language} disabled={!!busy} onChange={setLanguage}
                options={[
                    {value: '英语', label: 'English'},
                    {value: '简体中文', label: '简体中文'},
                    {value: '繁体中文', label: '繁體中文'},
                    {value: '日语', label: '日本語'},
                    {value: '韩语', label: '한국어'},
                    {value: '法语', label: 'Français'},
                    {value: '德语', label: 'Deutsch'},
                    {value: '西班牙语', label: 'Español'},
                    {value: '葡萄牙语', label: 'Português'},
                    {value: '意大利语', label: 'Italiano'},
                    {value: '荷兰语', label: 'Nederlands'},
                    {value: '俄语', label: 'Русский'},
                    {value: '乌克兰语', label: 'Українська'},
                    {value: '波兰语', label: 'Polski'},
                    {value: '捷克语', label: 'Čeština'},
                    {value: '斯洛伐克语', label: 'Slovenčina'},
                    {value: '匈牙利语', label: 'Magyar'},
                    {value: '罗马尼亚语', label: 'Română'},
                    {value: '希腊语', label: 'Ελληνικά'},
                    {value: '瑞典语', label: 'Svenska'},
                    {value: '挪威语', label: 'Norsk'},
                    {value: '丹麦语', label: 'Dansk'},
                    {value: '芬兰语', label: 'Suomi'},
                    {value: '土耳其语', label: 'Türkçe'},
                    {value: '阿拉伯语', label: 'العربية'},
                    {value: '希伯来语', label: 'עברית'},
                    {value: '波斯语', label: 'فارسی'},
                    {value: '印地语', label: 'हिन्दी'},
                    {value: '孟加拉语', label: 'বাংলা'},
                    {value: '泰米尔语', label: 'தமிழ்'},
                    {value: '泰语', label: 'ไทย'},
                    {value: '越南语', label: 'Tiếng Việt'},
                    {value: '印尼语', label: 'Bahasa Indonesia'},
                    {value: '马来语', label: 'Bahasa Melayu'},
                    {value: '菲律宾语', label: 'Filipino'},
                    {value: '斯瓦希里语', label: 'Kiswahili'},
                ]} />
            <p><Checkbox checked={translateTitle} disabled={!!busy} onChange={e => setTranslateTitle(e.target.checked)}>同步翻译标题</Checkbox></p>
        </Modal>
        <Modal title="智能审阅" width="min(1280px, 96vw)" open={dialog === 'review'} onCancel={closeReview} closable keyboard mask={{closable: true}}
            footer={<Button type="primary" disabled={!!busy || unresolved || !changes.length} onClick={applyReview}>更新正文</Button>}>
            {busy === 'review' ? <div className="review-loading" role="status"><Spin /><p>正在审阅文章…</p></div> : <ReviewMerge
                changes={changes} onChange={decide}
                onDecideAll={decision => setChanges(previous => previous.map(change =>
                    change.unchanged || change.decision ? change : {...change, decision}))} />}
        </Modal>
    </>;
    return {available, busy, run, content: store.articleInfo.markdown_content, dialogs};
}
