import React, {useEffect, useMemo, useRef, useState} from 'react';
import {observer} from '@admin/utils/mobx-react';
import {Alert, Button, Card, Drawer, Empty, Input, Modal, Select, Tag, Tooltip, message as toast} from 'antd';
import {Conversations, Prompts, Sender, Suggestion, Welcome, XProvider, notification} from '@ant-design/x';
import zhCN from '@ant-design/x/es/locale/zh_CN';
import antdZhCN from 'antd/es/locale/zh_CN';
import {ChatMessage, GenerationStatus, Markdown, commands, toolLabels} from './chat-content';
import {ArrowUpOutlined, PlusOutlined, CaretLeftOutlined, EditOutlined, DeleteOutlined, StopOutlined, BellOutlined, MessageOutlined, SearchOutlined, LockOutlined, MoreOutlined} from '@ant-design/icons';
import {Link, useRouteComponentProps} from '../../utils/router';
import {ChatStore} from './chat.store';
import './chat.less';
const ChatInput = React.forwardRef<any, any>((props, ref) => <Input.TextArea {...props} ref={ref} aria-label="聊天消息" />);
const chatLocale = {...antdZhCN, ...zhCN};
const senderComponents = {input: ChatInput};
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
    const [renaming, setRenaming] = useState('');
    const [desktopNotices, setDesktopNotices] = useState(false);
    const previousBusy = useRef(false);
    const [title, setTitle] = useState('');
    const bottom = useRef<HTMLDivElement>(null);
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
    const rename = (session: any) => { if (!locked) {setTitle(session.title); setRenaming(session.id)} };
    const remove = (session: any) => {
        if (locked) return;
        Modal.confirm({title: `删除「${session.title}」？`,
            content: '聊天记录将被清除。博客内容不会删除，AI 调用日志仍按原策略保留。',
            okText: '删除', cancelText: '取消', okButtonProps: {danger: true},
            onOk: async() => {
                await store.manage(session.id, 'delete');
                if (session.id === id) {setStarted(false); router.history.replace('/dashboard')}
            }});
    };
    const enableNotices = async() => {
        if (desktopNotices) {setDesktopNotices(false); return}
        if (await notification.requestPermission() === 'granted') setDesktopNotices(true);
        else toast.info('浏览器未开启通知，执行结果仍会保留在对话中');
    };
    useEffect(() => {
        if (previousBusy.current && !store.busy && desktopNotices && document.hidden && notification.permission === 'granted') {
            try { notification.open({title: 'Firekylin 任务已结束', body: '请返回后台查看回复或待确认操作。',
                tag: `firekylin-chat-${store.session?.id}`, duration: 8}) } catch { /* In-page results remain available. */ }
        }
        previousBusy.current = store.busy;
    }, [store.busy, desktopNotices, store]);
    const historyItems = store.sessions.filter(session => session.title.toLowerCase().includes(search.toLowerCase())).map(session => {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const days = Math.floor((start.getTime() - Number(session.updated_at)) / 86400000);
        return {key: session.id, group: days < 0 ? '今天' : days === 0 ? '昨天' : '更早', disabled: locked,
            icon: <MessageOutlined />, label: <div className="chat-session-label"><span>{session.title}</span>
                <small>{new Date(Number(session.updated_at)).toLocaleString('zh-CN', {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</small></div>};
    });
    const conversations = <div className="chat-history-content">
        <header className="chat-history-heading"><strong>会话记录</strong><Tag>{store.sessions.length}</Tag></header>
        <div className="chat-history-tools">
            <Button block aria-label="新建对话" icon={<PlusOutlined />} disabled={locked} onClick={newChat}>新建对话</Button>
            <Input aria-label="搜索对话" prefix={<SearchOutlined />} placeholder="搜索对话" allowClear value={search} onChange={event => setSearch(event.target.value)} />
        </div>
        <nav aria-label="对话列表">
            <Conversations items={historyItems} activeKey={id} groupable
                onActiveChange={key => {if (!locked) router.history.push(`/dashboard/${key}`)}}
                menu={item => ({trigger: <Button type="text" size="small" aria-label={`管理会话：${store.sessions.find(session => session.id === item.key)?.title || ''}`} icon={<MoreOutlined />} disabled={locked} />, items: [
                    {key: 'rename', label: '重命名', icon: <EditOutlined />, disabled: locked},
                    {key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true, disabled: locked}
                ], onClick: ({key}) => {
                    const session = store.sessions.find(session => session.id === item.key);
                    if (session) {if (key === 'rename') rename(session); else remove(session)}
                }})} />
            {!historyItems.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={search ? '没有匹配的会话' : '开始一次新的对话'} />}
        </nav>
        <footer><LockOutlined /> 对话仅自己可见</footer>
    </div>;
    return <XProvider locale={chatLocale} theme={{token: {colorPrimary: '#3695d5', borderRadius: 6, fontSize: 14}}}>
        <section className={`chat-workspace ${inConversation ? 'chat-conversation' : 'chat-home'}`} aria-label="聊天">
        <main className="chat-main">
            {inConversation && <header className="chat-header"><h4>{store.session?.title || '聊天'}</h4>
                <div className="chat-header-actions">
                    <Button type="text" aria-label="新建对话" icon={<PlusOutlined />} disabled={locked} onClick={newChat}>新建对话</Button>
                    {typeof window.Notification !== 'undefined' && <Tooltip title="仅在离开页面时通知任务结束，不包含聊天内容">
                        <Button type="text" icon={<BellOutlined />} aria-label="任务完成通知" aria-pressed={desktopNotices} onClick={() => safe(enableNotices())} />
                    </Tooltip>}
                    {id && <><Button type="text" aria-label="重命名对话" disabled={locked} icon={<EditOutlined />} onClick={() => rename(store.session)} />
                        <Button type="text" aria-label="删除对话" disabled={locked} icon={<DeleteOutlined />} onClick={() => remove(store.session)} /></>}
                </div>
            </header>}
            <div className={'chat-scroll' + (!inConversation ? ' chat-empty' : '')}>
                {!inConversation ? <Welcome className="chat-welcome" variant="borderless"
                    title="今天想写点什么？" classNames={{title: 'chat-welcome-title'}} description="从一个想法，到一篇值得发布的文章。" /> :
                    <div className="chat-messages">{store.messages.map(entry => <div key={entry.id} className="chat-message">
                        <ChatMessage entry={entry} actions={store.actions} messages={store.messages} running={locked} locked={locked}
                            preview={setPreview} retry={() => safe(store.stream('retry'))} />
                    </div>)}
                    {store.streaming && <div className="chat-message"><ChatMessage entry={{role: 'assistant', content: store.streaming}}
                        actions={[]} messages={[]} streaming running={true} locked={true} preview={setPreview} /></div>}
                    {locked && <GenerationStatus status={store.status} />}
                    {store.actions.filter(action => ['pending', 'executing', 'interrupted', 'failed', 'cancelled'].includes(action.status)).map(action => <Card size="small" className="chat-approval" key={action.id}>
                        <span className="chat-badge">{({expired: '确认已过期', pending: '等待确认', executing: '执行中', interrupted: '操作中断，请核对实际状态', failed: '执行失败，请核对实际状态', cancelled: '已取消'} as any)[action.status]}</span>
                        <h3>{toolLabels[action.payload.name] || action.payload.name}</h3>
                        {action.payload.before?.title && <b>{action.payload.before.title}</b>}
                        <OperationPreview action={action} />
                        {action.status === 'pending' && <><p className="chat-muted">确认在 15 分钟内有效；对象发生变化时需要重新预览。</p>
                            <Button disabled={locked} onClick={() => safe(store.stream('confirm', {action: action.id, approve: false}))}>取消操作</Button>
                            <Button type="primary" danger={action.payload.name.endsWith('.delete')} disabled={locked} onClick={() => safe(store.stream('confirm', {action: action.id, approve: true}))}>确认执行</Button></>}
                    </Card>)}<div ref={bottom} /></div>}
            </div>
            <footer className="chat-composer-area">
                {store.error && <Alert type="warning" title={store.error} closable onClose={() => {store.error = ''}} />}
                {!models.length ? <div className="chat-connect"><h3>连接你的 AI 服务商</h3><p>配置完成后，即可开始聊天和管理博客。</p><Link to="/options/ai">前往 AI 连接设置 →</Link></div> : <>
                    <Suggestion items={commands.map(command => ({label: command.label, value: command.description}))}
                        onSelect={value => setInput(value)}>
                        {({onTrigger, onKeyDown, open}) => <Sender className="chat-composer" value={input} components={senderComponents}
                            placeholder={pending ? '请先确认或取消上方操作' : '帮我写文章、整理内容或管理博客… 输入 / 查看快捷指令'}
                            autoSize={{minRows: inConversation ? 2 : 3, maxRows: 8}} disabled={Boolean(pending)}
                            loading={sending || store.busy || Boolean(store.session?.active_run)}
                            onChange={value => {setInput(value); onTrigger(value === '/' ? {} : false)}}
                            onKeyDown={event => {onKeyDown(event); if (open && event.key === 'Enter') return false; return undefined}}
                            onSubmit={() => safe(send())} onCancel={() => safe(store.stop())} suffix={false}
                            footer={(_, {components: {SendButton, LoadingButton}}) => <div className="chat-composer-toolbar">
                                <span className="chat-muted">{models.find(model => model.value === selected)?.tools ? '博客技能已启用' : '普通问答 · 当前模型不支持博客操作'}</span>
                                <Select aria-label="聊天模型" placeholder="选择模型" variant="borderless" value={selected} options={models} disabled={locked || Boolean(pending)}
                                    onChange={value => safe((async() => {if (!store.session) {const created = await store.create(); await store.open(created); router.history.replace(`/dashboard/${created}`)}
                                        const [provider, model] = JSON.parse(value); await store.mutate('select', {provider, model});})())} />
                                {sending || store.busy || store.session?.active_run ? <LoadingButton disabled={false} aria-label="停止生成" icon={<StopOutlined />} /> :
                                    <SendButton type="primary" aria-label="发送消息" icon={<ArrowUpOutlined />} disabled={!input.trim() || Boolean(pending) || !selected || locked}>发送</SendButton>}
                            </div>} />}
                    </Suggestion>
                    {!inConversation && <Prompts className="chat-suggestions" wrap
                        items={commands.map(command => ({...command, disabled: locked, description: undefined}))}
                        onItemClick={({data}) => setInput(commands.find(command => command.key === data.key)!.description)} />}
                    <small className="chat-footnote">AI 可能出错，请核对文章内容和操作结果。</small>
                </>}
            </footer>
            {!inConversation && children && <div className="chat-overview-details">{children}</div>}
        </main>
        <aside className={`chat-history-shell${historyOpen ? ' is-open' : ''}`}>
            <button type="button" className="chat-history-toggle" aria-label={historyOpen ? '收起会话列表' : '展开会话列表'}
                aria-expanded={historyOpen} aria-controls="overview-chat-history" onClick={() => setHistoryOpen(open => !open)}>
                <CaretLeftOutlined className="chat-history-toggle-icon" />
            </button>
            <div id="overview-chat-history" className="chat-history-panel" aria-hidden={!historyOpen} inert={!historyOpen}>
                {conversations}
            </div>
        </aside>
        <Drawer title={preview?.title || '文章预览'} size="large" open={Boolean(preview)} onClose={() => setPreview(null)}>{preview && <Markdown text={preview.markdown_content || preview.summary || ''} />}</Drawer>
        <Modal title="重命名对话" okText="保存" cancelText="取消" open={Boolean(renaming)} onCancel={() => setRenaming('')} onOk={() => safe(store.manage(renaming, 'rename', {title}).then(() => setRenaming('')))}><Input aria-label="对话标题" value={title} maxLength={100} onChange={event => setTitle(event.target.value)} /></Modal>
    </section></XProvider>;
}
export default observer(Chat);
