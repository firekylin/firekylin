import React, {useEffect, useMemo, useRef, useState} from 'react';
import {observer} from '@admin/utils/mobx-react';
import {Alert, Button, Drawer, Input, Modal, Select, message as toast} from 'antd';
import {ArrowUpOutlined, PlusOutlined, CaretLeftOutlined, CaretRightOutlined, CopyOutlined, EditOutlined, DeleteOutlined, StopOutlined} from '@ant-design/icons';
import MarkdownIt from 'markdown-it';
import {Link, useRouteComponentProps} from '../../utils/router';
import {ChatStore} from './chat.store';
import './chat.less';
const markdown = new MarkdownIt({html: false, linkify: true, breaks: true});
markdown.renderer.rules.image = (tokens, index) => markdown.utils.escapeHtml(tokens[index].content || '图片');
function Markdown({text}: {text: string}) {
    return <div className="chat-markdown" dangerouslySetInnerHTML={{__html: markdown.render(text || '')}} />;
}
const toolLabels: Record<string, string> = {
    'posts.publish': '发布文章', 'posts.delete': '永久删除文章', 'posts.update': '修改文章',
    'posts.create_draft': '创建草稿', 'posts.update_draft': '修改草稿',
    'comments.moderate': '处理评论', 'comments.approve': '批准评论', 'comments.update': '修改评论',
    'comments.create': '发表评论', 'settings.update': '修改站点设置'
};
const fieldLabels: Record<string, string> = {
    title: '标题', description: '站点描述', pathname: '文章路径', markdown_content: '正文',
    name: '名称', pid: '父分类', comment: '评论内容', status: '状态', is_public: '可见性',
    site_url: '站点地址', keywords: '关键词', logo_url: '站点标志', favicon_url: '浏览器图标',
    postsListSize: '每页文章数', post_permalink: '文章链接格式', page_permalink: '页面链接格式'
};
function displayValue(key: string, value: any, comments = false) {
    if (value === undefined || value === null) return '未设置';
    if (key === 'status') return comments ? ({approved: '已批准', waiting: '待审核', spam: '垃圾评论', delete: '删除'} as any)[value] || value :
        ({0: '草稿', 1: '待审核', 2: '已拒绝', 3: '已发布', 4: '回收站'} as any)[value] || value;
    if (key === 'is_public') return Number(value) === 1 ? '公开' : '私有';
    return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
}
function OperationPreview({action}: any) {
    const {name, input, before, observed} = action.payload;
    const changes = name === 'posts.publish' ? {status: 3, ...(input.is_public === undefined ? {} : {is_public: input.is_public})} : name.endsWith('.delete') ? {status: '永久删除（不可恢复）'} : input.settings || input;
    const entries = Object.entries(changes).filter(([key]) => key !== 'id');
    return <>
        {entries.map(([key, value]) => <section className="chat-change" key={key}>
            <h4>{fieldLabels[key] || key}</h4><div className="chat-diff">
                <div><small>修改前</small><pre>{displayValue(key, before?.[key], name.startsWith('comments.'))}</pre></div>
                <div><small>将变更为</small><pre>{displayValue(key, value, name.startsWith('comments.'))}</pre></div>
            </div>
        </section>)}
        {name === 'posts.publish' && <p>发布后可见性：{displayValue('is_public', input.is_public ?? before?.is_public)}。</p>}
        {name === 'posts.delete' && <p>文章及关联内容将按博客删除规则处理。</p>}
        {observed && <p>当前实际状态：{displayValue('status', observed.status, name.startsWith('comments.'))} · {observed.title || ''}</p>}
        <details><summary>查看操作详情</summary><pre>{JSON.stringify(input, null, 2)}</pre></details>
    </>;
}
function Result({entry, preview}: any) {
    let result: any;
    try { result = JSON.parse(entry.content) } catch { return null }
    if (result.error) return <Alert type="error" title={result.error} />;
    if (result.cancelled) return <span className="chat-muted">操作已取消</span>;
    const rows = Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : result.post ? [result.post] : result.id ? [result] : [];
    return <div className="chat-result">
        <strong>{toolLabels[entry.name] || entry.name} · 已完成</strong>
        {rows.slice(0, 20).map((row: any, index: number) => <div className="chat-result-row" key={row.id || index}>
            <div><b>{row.title || row.name || row.nick || `#${row.id}`}</b>
                {row.status !== undefined && <span className="chat-badge">{({0: '草稿', 1: '待审核', 2: '已拒绝', 3: '已发布', 4: '回收站'} as any)[row.status] || row.status}</span>}
                {row.comment && <p>{String(row.comment).replace(/<[^>]*>/g, '').slice(0, 160)}</p>}
            </div>
            {(row.markdown_content || row.summary) && <Button size="small" onClick={() => preview(row)}>预览</Button>}
            {row.url?.startsWith('/') && !row.url.startsWith('//') && <a href={row.url} target="_blank" rel="noreferrer">查看文章</a>}
            {entry.name?.startsWith('posts.') && row.id && entry.name !== 'posts.delete' && <Link to={`/post/edit/${row.id}`}>打开编辑器</Link>}
        </div>)}
        {!rows.length && <details><summary>查看结果</summary><pre>{JSON.stringify(result, null, 2)}</pre></details>}
        {rows.length > 20 && <p>仅展示前 20 条，请在管理页面查看全部结果。</p>}
    </div>;
}
function Chat({children, onConversationChange}: {
    children?: React.ReactNode;
    onConversationChange?: (active: boolean) => void;
}) {
    const store = useMemo(() => new ChatStore(), []);
    const router = useRouteComponentProps();
    const id = router.location.pathname.match(/\/dashboard\/([^/]+)/)?.[1];
    const [input, setInput] = useState('');
    const [search, setSearch] = useState('');
    const [historyOpen, setHistoryOpen] = useState(false);
    const [started, setStarted] = useState(false);
    const [sending, setSending] = useState(false);
    const [preview, setPreview] = useState<any>(null);
    const [renaming, setRenaming] = useState(false);
    const [title, setTitle] = useState('');
    const bottom = useRef<HTMLDivElement>(null);
    const composing = useRef(false);
    const safe = (promise: Promise<any>) => promise.catch(error => toast.error(error.message));
    useEffect(() => { safe(store.list()); }, [store]);
    useEffect(() => { safe(store.open(id)); }, [store, id]);
    useEffect(() => { bottom.current?.scrollIntoView?.({block: 'end'}); }, [store.messages.length, store.streaming, store.busy]);
    // Poll only a run owned by another tab/worker, including after disconnects.
    useEffect(() => {
        if (!id || store.busy || !store.session?.active_run) return;
        const timer = setInterval(() => safe(store.open(id)), 2500);
        return () => clearInterval(timer);
    }, [id, store, store.busy, store.session?.active_run]);
    const inConversation = started || store.busy || Boolean(store.session?.active_run) ||
        store.messages.some(entry => ['user', 'assistant', 'tool'].includes(entry.role));
    useEffect(() => { if (inConversation) setHistoryOpen(true); }, [inConversation]);
    useEffect(() => { onConversationChange?.(inConversation); }, [inConversation, onConversationChange]);
    const locked = sending || store.loading || store.busy || Boolean(store.session?.active_run);
    const pending = store.actions.find(action => action.status === 'pending');
    const models = store.providers.filter(provider => provider.configured !== false).flatMap(provider =>
        provider.models.filter((model: any) => model.capabilities.includes('text')).map((model: any) => ({
            value: JSON.stringify([provider.id, model.id]), label: `${provider.label} / ${model.label || model.id}`,
            selected: model.selected, tools: model.capabilities.includes('tools')
        })));
    const selected = store.session?.provider ? JSON.stringify([store.session.provider, store.session.model]) : models.find(model => model.selected)?.value;
    const send = async(content = input) => {
        if (!content.trim() || locked || pending || !selected) return;
        setStarted(true);
        setSending(true);
        try {
            let sessionId = id;
            if (!sessionId) {
                sessionId = await store.create();
                await store.open(sessionId);
                router.history.replace(`/dashboard/${sessionId}`);
            }
            setInput('');
            await store.stream('send', {content});
        } finally { setSending(false); setStarted(false); }
    };
    const newChat = () => {
        if (locked) return;
        setStarted(false);
        setHistoryOpen(false);
        setInput('');
        router.history.push('/dashboard');
    };
    const conversations = <aside className="chat-history-content">
        <Button block aria-label="新建对话" icon={<PlusOutlined />} disabled={locked} onClick={newChat}>新建对话</Button>
        <Input.Search aria-label="搜索对话" placeholder="搜索对话" value={search} onChange={event => setSearch(event.target.value)} />
        <nav aria-label="对话列表">{['今天', '昨天', '更早'].map(group => {
            const start = new Date(); start.setHours(0, 0, 0, 0);
            const rows = store.sessions.filter(session => {
                const days = Math.floor((start.getTime() - Number(session.updated_at)) / 86400000);
                return (days < 0 ? '今天' : days === 0 ? '昨天' : '更早') === group && session.title.toLowerCase().includes(search.toLowerCase());
            });
            return rows.length ? <section key={group}><h4>{group}</h4>{rows.map(session => <button className={session.id === id ? 'selected' : ''}
                key={session.id} disabled={locked} onClick={() => {router.history.push(`/dashboard/${session.id}`)}}>{session.title}</button>)}</section> : null;
        })}</nav>
        <small>对话仅自己可见</small>
    </aside>;
    return <section className={`chat-workspace ${inConversation ? 'chat-conversation' : 'chat-home'}`} aria-label="聊天">
        <main className="chat-main">
            {inConversation && <header className="chat-header"><h4>{store.session?.title || '聊天'}</h4>
                <div className="chat-header-actions">
                    <Button type="text" aria-label="新建对话" icon={<PlusOutlined />} disabled={locked} onClick={newChat}>新建对话</Button>
                    {id && <><Button type="text" aria-label="重命名对话" disabled={locked} icon={<EditOutlined />} onClick={() => {setTitle(store.session?.title || ''); setRenaming(true)}} />
                        <Button type="text" aria-label="删除对话" disabled={locked} icon={<DeleteOutlined />} onClick={() => Modal.confirm({title: '删除这段对话？',
                            content: '聊天记录将被清除。博客内容不会删除，AI 调用日志仍按原策略保留。', okText: '删除', cancelText: '取消', okButtonProps: {danger: true},
                            onOk: async() => {await store.mutate('delete'); router.history.replace('/dashboard')}})} /></>}
                </div>
            </header>}
            <div className={'chat-scroll' + (!inConversation ? ' chat-empty' : '')}>
                {!inConversation ? <div className="chat-welcome"><h1>今天想写点什么？</h1><p>从一个想法，到一篇值得发布的文章。</p></div> :
                    <div className="chat-messages">{store.messages.map(entry => <article key={entry.id} className={`chat-message chat-message-${entry.role}`}>
                        {entry.role === 'tool' ? <Result entry={entry} preview={setPreview} /> : entry.role === 'error' ?
                            <Alert type="error" title={entry.content} action={<Button size="small" disabled={locked} onClick={() => safe(store.stream('retry'))}>重试回复</Button>} /> :
                            entry.role === 'event' ? <p className="chat-event">{entry.content}</p> : <>
                                {entry.content && <Markdown text={entry.content} />}
                                {entry.toolCalls && <details><summary>博客操作 · {entry.toolCalls.map((call: any) => toolLabels[call.name] || call.name).join('、')}</summary><pre>{JSON.stringify(entry.toolCalls, null, 2)}</pre></details>}
                                {entry.role === 'assistant' && entry.content && <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => safe(navigator.clipboard.writeText(entry.content))}>复制</Button>}
                            </>}
                    </article>)}
                    {store.streaming && <article className="chat-message"><Markdown text={store.streaming} /></article>}
                    {locked && <p role="status" className="chat-status">{store.status || '正在执行，请稍候…'}</p>}
                    {store.actions.filter(action => ['pending', 'executing', 'interrupted', 'failed', 'cancelled'].includes(action.status)).map(action => <section className="chat-approval" key={action.id}>
                        <span className="chat-badge">{({expired: '确认已过期', pending: '等待确认', executing: '执行中', interrupted: '操作中断，请核对实际状态', failed: '执行失败，请核对实际状态', cancelled: '已取消'} as any)[action.status]}</span>
                        <h3>{toolLabels[action.payload.name] || action.payload.name}</h3>
                        {action.payload.before?.title && <b>{action.payload.before.title}</b>}
                        <OperationPreview action={action} />
                        {action.status === 'pending' && <><p className="chat-muted">确认在 15 分钟内有效；对象发生变化时需要重新预览。</p>
                            <Button disabled={locked} onClick={() => safe(store.stream('confirm', {action: action.id, approve: false}))}>取消操作</Button>
                            <Button type="primary" danger={action.payload.name.endsWith('.delete')} disabled={locked} onClick={() => safe(store.stream('confirm', {action: action.id, approve: true}))}>确认执行</Button></>}
                    </section>)}<div ref={bottom} /></div>}
            </div>
            <footer className="chat-composer-area">
                {store.error && <Alert type="warning" title={store.error} closable onClose={() => {store.error = ''}} />}
                {!models.length ? <div className="chat-connect"><h3>连接你的 AI 服务商</h3><p>配置完成后，即可开始聊天和管理博客。</p><Link to="/options/ai">前往 AI 连接设置 →</Link></div> : <>
                    <div className="chat-composer">
                        <Input.TextArea aria-label="聊天消息" placeholder={pending ? '请先确认或取消上方操作' : '帮我写文章、整理内容或管理博客…'} autoSize={{minRows: inConversation ? 2 : 3, maxRows: 8}} value={input}
                            disabled={Boolean(pending)} onChange={event => setInput(event.target.value)}
                            onCompositionStart={() => {composing.current = true}} onCompositionEnd={() => {composing.current = false}}
                            onKeyDown={event => {if (event.key === 'Enter' && !event.shiftKey && !composing.current && !event.nativeEvent.isComposing) {event.preventDefault(); safe(send())}}} />
                        <div className="chat-composer-toolbar"><span className="chat-muted">{models.find(model => model.value === selected)?.tools ? '博客技能已启用' : '普通问答 · 当前模型不支持博客操作'}</span>
                            <Select aria-label="聊天模型" placeholder="选择模型" variant="borderless" value={selected} options={models} disabled={locked || Boolean(pending)}
                                onChange={value => safe((async() => {if (!store.session) {const created = await store.create(); await store.open(created); router.history.replace(`/dashboard/${created}`)}
                                    const [provider, model] = JSON.parse(value); await store.mutate('select', {provider, model});})())} />
                            {locked ? <Button aria-label="停止生成" icon={<StopOutlined />} onClick={() => safe(store.stop())} /> : <Button type="primary" aria-label="发送消息" icon={<ArrowUpOutlined />} disabled={!input.trim() || Boolean(pending) || !selected} onClick={() => safe(send())}>发送</Button>}
                        </div>
                    </div>
                    {!inConversation && <div className="chat-suggestions">{['帮我写一篇新文章，先讨论选题', '查找最近的草稿', '查看博客分类和标签', '查看待审核的评论'].map(text => <button key={text} disabled={locked} onClick={() => setInput(text)}>{text}</button>)}</div>}
                    <small className="chat-footnote">AI 可能出错，请核对文章内容和操作结果。</small>
                </>}
            </footer>
            {!inConversation && children && <div className="chat-overview-details">{children}</div>}
        </main>
        <div className="chat-history-rail">
            <button type="button" className="chat-history-toggle" aria-label={historyOpen ? '收起会话列表' : '展开会话列表'}
                aria-expanded={historyOpen} aria-controls="overview-chat-history" onClick={() => setHistoryOpen(open => !open)}>
                {historyOpen ? <CaretRightOutlined /> : <CaretLeftOutlined />}
            </button>
        </div>
        <aside id="overview-chat-history" className="chat-history" hidden={!historyOpen}>{historyOpen && conversations}</aside>
        <Drawer title={preview?.title || '文章预览'} size="large" open={Boolean(preview)} onClose={() => setPreview(null)}>{preview && <Markdown text={preview.markdown_content || preview.summary || ''} />}</Drawer>
        <Modal title="重命名对话" open={renaming} onCancel={() => setRenaming(false)} onOk={() => safe(store.mutate('rename', {title}).then(() => setRenaming(false)))}><Input aria-label="对话标题" value={title} maxLength={100} onChange={event => setTitle(event.target.value)} /></Modal>
    </section>;
}
export default observer(Chat);
