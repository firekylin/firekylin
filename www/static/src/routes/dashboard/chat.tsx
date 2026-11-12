import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {observer} from '@admin/utils/mobx-react';
import {Alert, Button, Card, Empty, Input, Modal, Select, Tag, Tooltip, message as toast} from 'antd';
import {Conversations, Prompts, Sender, Suggestion, Welcome, XProvider, notification} from '@ant-design/x';
import zhCN from '@ant-design/x/es/locale/zh_CN';
import antdZhCN from 'antd/es/locale/zh_CN';
import enUS from '@ant-design/x/es/locale/en_US';
import antdEnUS from 'antd/es/locale/en_US';
import {ChatMessage, GenerationStatus, getCommands, getToolLabels} from './chat-content';
import {PaperClipOutlined, ArrowUpOutlined, PlusOutlined, CaretLeftOutlined, EditOutlined, DeleteOutlined, StopOutlined, BellOutlined, MessageOutlined, SearchOutlined, LockOutlined, MoreOutlined} from '@ant-design/icons';
import {Link, useRouteComponentProps} from '../../utils/router';
import {ChatStore} from './chat.store';
import './chat.less';
import {DraftAttachments, ChatAttachment, readChatFiles, attachmentAccept, textAttachmentAccept} from './chat-attachments';
import {http} from '../../utils/http';
import {openArticlePreview} from '../../components/article/preview';
const ChatInput = React.forwardRef<any, any>((props, ref) => <Input.TextArea {...props} ref={ref} aria-label={i18n.t("聊天消息")} />);
const chatLocales = {
    'zh-CN': {...antdZhCN, ...zhCN},
    'en-US': {...antdEnUS, ...enUS}
};
const senderComponents = {input: ChatInput};
const getFieldLabels = (): Record<string, string> => ({
    title: i18n.t("标题"), description: i18n.t("站点描述"), pathname: i18n.t("文章路径"), markdown_content: i18n.t("正文"),
    name: i18n.t("名称"), pid: i18n.t("父分类"), comment: i18n.t("评论内容"), status: i18n.t("状态"), is_public: i18n.t("可见性"),
    site_url: i18n.t("站点地址"), keywords: i18n.t("关键词"), logo_url: i18n.t("站点标志"), favicon_url: i18n.t("浏览器图标"),
    postsListSize: i18n.t("每页文章数"), post_permalink: i18n.t("文章链接格式"), page_permalink: i18n.t("页面链接格式")
});
function displayValue(key: string, value: any, comments = false) {
    if (value === undefined || value === null) return i18n.t("未设置");
    if (key === 'status') return comments ? ({approved: i18n.t("已批准"), waiting: i18n.t("待审核"), spam: i18n.t("垃圾评论"), delete: i18n.t("删除")} as any)[value] || value :
        ({0: i18n.t("草稿"), 1: i18n.t("待审核"), 2: i18n.t("已拒绝"), 3: i18n.t("已发布"), 4: i18n.t("回收站")} as any)[value] || value;
    if (key === 'is_public') return Number(value) === 1 ? i18n.t("公开") : i18n.t("私有");
    return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
}
function OperationPreview({action}: any) {
    useTranslation('admin');
    const {name, input, before, observed} = action.payload;
    const changes = name === 'posts.publish' ? {status: 3, ...(input.is_public === undefined ? {} : {is_public: input.is_public})} : name.endsWith('.delete') ? {status: i18n.t("永久删除（不可恢复）")} : input.settings || input;
    const entries = Object.entries(changes).filter(([key]) => key !== 'id');
    return <>
        {entries.map(([key, value]) => <section className="chat-change" key={key}>
            <h4>{getFieldLabels()[key] || key}</h4><div className="chat-diff">
                <div><small>{i18n.t("修改前")}</small><pre>{displayValue(key, before?.[key], name.startsWith('comments.'))}</pre></div>
                <div><small>{i18n.t("将变更为")}</small><pre>{displayValue(key, value, name.startsWith('comments.'))}</pre></div>
            </div>
        </section>)}
        {name === 'posts.publish' && <p>{i18n.t("发布后可见性：")}{displayValue('is_public', input.is_public ?? before?.is_public)}。</p>}
        {name === 'posts.delete' && <p>{i18n.t("文章及关联内容将按博客删除规则处理。")}</p>}
        {observed && <p>{i18n.t("当前实际状态：")}{displayValue('status', observed.status, name.startsWith('comments.'))} · {observed.title || ''}</p>}
        <details><summary>{i18n.t("查看操作详情")}</summary><pre>{JSON.stringify(input, null, 2)}</pre></details>
    </>;
}
function Chat({children, onConversationChange}: {
    children?: React.ReactNode;
    onConversationChange?: (active: boolean) => void;
}) {
    useTranslation('admin');
    const store = useMemo(() => new ChatStore(), []);
    const router = useRouteComponentProps();
    const id = router.location.pathname.match(/\/dashboard\/([^/]+)/)?.[1];
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
    const [readingFiles, setReadingFiles] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);
    const attachmentGeneration = useRef(0);
    const readingFilesRef = useRef(false);
    const draftSession = useRef<string | null>(null);
    useEffect(() => {
        const assigningDraft = Boolean(id && draftSession.current === id);
        draftSession.current = null;
        if (!assigningDraft) { attachmentGeneration.current++; setAttachments([]); }
    }, [id]);
    const assignDraftSession = (sessionId: string) => {
        draftSession.current = sessionId;
        router.history.replace(`/dashboard/${sessionId}`);
    };
    const [search, setSearch] = useState('');
    const [historyOpen, setHistoryOpen] = useState(false);
    const [started, setStarted] = useState(false);
    const [sending, setSending] = useState(false);
    const previewArticle = (row: any) => {
        http.get<any>(`/admin/api/post/${Number(row.id)}`).subscribe(res => {
            if (res.errno === 0) openArticlePreview(res.data, Number(res.data.type) || 0);
        });
    };
    const [renaming, setRenaming] = useState('');
    const [desktopNotices, setDesktopNotices] = useState(false);
    const previousBusy = useRef(false);
    const [title, setTitle] = useState('');
    const bottom = useRef<HTMLDivElement>(null);
    const safe = (promise: Promise<any>) => promise.catch(error => toast.error(i18n.t(error.message || '')));
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
    useEffect(() => {
        if (inConversation) setHistoryOpen(!window.matchMedia('(max-width: 700px)').matches);
    }, [inConversation]);
    useEffect(() => {
        const media = window.matchMedia('(max-width: 700px)');
        const collapse = () => {if (media.matches) setHistoryOpen(false)};
        media.addEventListener?.('change', collapse);
        return () => media.removeEventListener?.('change', collapse);
    }, []);
    useEffect(() => { onConversationChange?.(inConversation); }, [inConversation, onConversationChange]);
    const locked = readingFiles || sending || store.loading || store.busy || Boolean(store.session?.active_run);
    const pending = store.actions.find(action => action.status === 'pending');
    const needsVision = attachments.some(file => file.kind === 'image') || store.messages.some(entry => entry.attachments?.some((file: any) => file.kind === 'image'));
    const models = store.providers.filter(provider => provider.configured !== false).flatMap(provider =>
        provider.models.filter((model: any) => model.capabilities.includes('text')).map((model: any) => ({
            value: JSON.stringify([provider.id, model.id]), label: `${provider.label} / ${model.label || model.id}`,
            selected: model.selected, tools: model.capabilities.includes('tools'), vision: model.capabilities.includes('vision'),
            disabled: needsVision && !model.capabilities.includes('vision')
        })));
    const sessionModel = JSON.stringify([store.session?.provider, store.session?.model]);
    const selected = models.find(model => model.value === sessionModel)?.value || models.find(model => model.selected)?.value || models[0]?.value;
    const canReadImages = models.find(model => model.value === selected)?.vision;
    const addFiles = async(files: File[]) => {
        if (!files.length) return;
        if (locked || pending || readingFilesRef.current) throw new Error(i18n.t("请等待当前操作完成后再添加附件"));
        const generation = attachmentGeneration.current;
        readingFilesRef.current = true;
        setReadingFiles(true);
        try {
            const value = await readChatFiles(files, attachments, canReadImages);
            if (generation === attachmentGeneration.current) setAttachments(value);
        } finally {
            readingFilesRef.current = false;
            setReadingFiles(false);
        }
    };
    const pasteImages: React.ClipboardEventHandler<HTMLElement> = event => {
        const clipboard = event.clipboardData;
        const files = Array.from(clipboard.files || []);
        const images = (files.length ? files : Array.from(clipboard.items || [])
            .filter(item => item.kind === 'file').map(item => item.getAsFile()).filter((file): file is File => Boolean(file)))
            .filter(file => file.type.startsWith('image/'));
        if (!images.length) return;
        // A mixed clipboard can still insert its plain text through the browser.
        if (!clipboard.getData('text/plain')) event.preventDefault();
        safe(addFiles(images));
    };
    const send = async(content = input) => {
        if ((!content.trim() && !attachments.length) || locked || pending || !selected) return;
        if (needsVision && !canReadImages) throw new Error(i18n.t("请先选择支持视觉能力的模型"));
        setStarted(true);
        store.setPendingMessage({id: crypto.randomUUID(), role: 'user', content: content.trim(), attachments});
        setInput('');
        setSending(true);
        try {
            let sessionId = id;
            if (!sessionId) {
                sessionId = await store.create();
                await store.open(sessionId);
                assignDraftSession(sessionId);
            }
            const [provider, model] = JSON.parse(selected);
            if (store.session.provider !== provider || store.session.model !== model) await store.mutate('select', {provider, model});
            const accepted = await store.stream('send', {content, ...(attachments.length ? {attachments} : {})});
            if (accepted) setAttachments([]);
            else {setInput(content); setAttachments(attachments);}
        } catch (error) { setInput(content); setAttachments(attachments); throw error; }
        finally { store.setPendingMessage(null); setSending(false); setStarted(false); }
    };
    const newChat = () => {
        if (locked) return;
        setStarted(false);
        setHistoryOpen(false);
        setInput('');
        setAttachments([]);
        router.history.push('/dashboard');
    };
    const rename = (session: any) => { if (!locked) {setTitle(session.title); setRenaming(session.id)} };
    const remove = (session: any) => {
        if (locked) return;
        Modal.confirm({title: i18n.t("删除「{{value0}}」？", {value0: session.title}),
            content: i18n.t("聊天记录将被清除。博客内容不会删除，AI 调用日志仍按原策略保留。"),
            okText: i18n.t("删除"), cancelText: i18n.t("取消"), okButtonProps: {danger: true},
            onOk: async() => {
                await store.manage(session.id, 'delete');
                if (session.id === id) {setStarted(false); router.history.replace('/dashboard')}
            }});
    };
    const enableNotices = async() => {
        if (desktopNotices) {setDesktopNotices(false); return}
        if (await notification.requestPermission() === 'granted') setDesktopNotices(true);
        else toast.info(i18n.t("浏览器未开启通知，执行结果仍会保留在对话中"));
    };
    useEffect(() => {
        if (previousBusy.current && !store.busy && desktopNotices && document.hidden && notification.permission === 'granted') {
            try { notification.open({title: i18n.t("Firekylin 任务已结束"), body: i18n.t("请返回后台查看回复或待确认操作。"),
                tag: `firekylin-chat-${store.session?.id}`, duration: 8}) } catch { /* In-page results remain available. */ }
        }
        previousBusy.current = store.busy;
    }, [store.busy, desktopNotices, store]);
    const historyItems = store.sessions.filter(session => session.title.toLowerCase().includes(search.toLowerCase())).map(session => {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const days = Math.floor((start.getTime() - Number(session.updated_at)) / 86400000);
        return {key: session.id, group: days < 0 ? i18n.t("今天") : days === 0 ? i18n.t("昨天") : i18n.t("更早"), disabled: locked,
            icon: <MessageOutlined />, label: <div className="chat-session-label"><span>{session.title}</span>
                <small>{new Date(Number(session.updated_at)).toLocaleString('zh-CN', {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</small></div>};
    });
    const conversations = <div className="chat-history-content">
        <header className="chat-history-heading"><strong>{i18n.t("会话记录")}</strong><Tag>{store.sessions.length}</Tag></header>
        <div className="chat-history-tools">
            <Button block aria-label={i18n.t("新建对话")} icon={<PlusOutlined />} disabled={locked} onClick={newChat}>{i18n.t("新建对话")}</Button>
            <Input aria-label={i18n.t("搜索对话")} prefix={<SearchOutlined />} placeholder={i18n.t("搜索对话")} allowClear value={search} onChange={event => setSearch(event.target.value)} />
        </div>
        <nav aria-label={i18n.t("对话列表")}>
            <Conversations items={historyItems} activeKey={id} groupable
                onActiveChange={key => {if (!locked) router.history.push(`/dashboard/${key}`)}}
                menu={item => ({trigger: <Button type="text" size="small" aria-label={i18n.t("管理会话：{{value0}}", {value0: store.sessions.find(session => session.id === item.key)?.title || ''})} icon={<MoreOutlined />} disabled={locked} />, items: [
                    {key: 'rename', label: i18n.t("重命名"), icon: <EditOutlined />, disabled: locked},
                    {key: 'delete', label: i18n.t("删除"), icon: <DeleteOutlined />, danger: true, disabled: locked}
                ], onClick: ({key}) => {
                    const session = store.sessions.find(session => session.id === item.key);
                    if (session) {if (key === 'rename') rename(session); else remove(session)}
                }})} />
            {!historyItems.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={search ? i18n.t("没有匹配的会话") : i18n.t("开始一次新的对话")} />}
        </nav>
        <footer><LockOutlined />{i18n.t(" 对话仅自己可见")}</footer>
    </div>;
    return <XProvider locale={chatLocales[i18n.language] || chatLocales['zh-CN']} theme={{token: {colorPrimary: '#3695d5', borderRadius: 6, fontSize: 14}}}>
        <section className={`chat-workspace ${inConversation ? 'chat-conversation' : 'chat-home'}`} aria-label={i18n.t("聊天")}>
        <main className="chat-main">
            {inConversation && <header className="chat-header"><h4>{store.session?.title || i18n.t("聊天")}</h4>
                <div className="chat-header-actions">
                    <Button type="text" aria-label={i18n.t("新建对话")} icon={<PlusOutlined />} disabled={locked} onClick={newChat}>{i18n.t("新建对话")}</Button>
                    {typeof window.Notification !== 'undefined' && <Tooltip title={i18n.t("仅在离开页面时通知任务结束，不包含聊天内容")}>
                        <Button type="text" icon={<BellOutlined />} aria-label={i18n.t("任务完成通知")} aria-pressed={desktopNotices} onClick={() => safe(enableNotices())} />
                    </Tooltip>}
                    {id && <><Button type="text" aria-label={i18n.t("重命名对话")} disabled={locked} icon={<EditOutlined />} onClick={() => rename(store.session)} />
                        <Button type="text" aria-label={i18n.t("删除对话")} disabled={locked} icon={<DeleteOutlined />} onClick={() => remove(store.session)} /></>}
                </div>
            </header>}
            <div className={'chat-scroll' + (!inConversation ? ' chat-empty' : '')}>
                {!inConversation ? <Welcome className="chat-welcome" variant="borderless"
                    title={i18n.t("今天想写点什么？")} classNames={{title: 'chat-welcome-title'}} description={i18n.t("从一个想法，到一篇值得发布的文章。")} /> :
                    <div className="chat-messages">{[...store.messages, ...(store.pendingMessage ? [store.pendingMessage] : [])].map(entry => <div key={entry.id} className="chat-message">
                        <ChatMessage entry={entry} actions={store.actions} messages={store.messages} running={locked} locked={locked}
                            preview={previewArticle} retry={() => safe(store.stream('retry'))} />
                    </div>)}
                    {store.streaming && <div className="chat-message"><ChatMessage entry={{role: 'assistant', content: store.streaming}}
                        actions={[]} messages={[]} streaming running={true} locked={true} preview={previewArticle} /></div>}
                    {locked && <GenerationStatus status={store.status} />}
                    {store.actions.filter(action => ['pending', 'executing', 'interrupted', 'failed', 'cancelled'].includes(action.status)).map(action => <Card size="small" className="chat-approval" key={action.id}>
                        <span className="chat-badge">{({expired: i18n.t("确认已过期"), pending: i18n.t("等待确认"), executing: i18n.t("执行中"), interrupted: i18n.t("操作中断，请核对实际状态"), failed: i18n.t("执行失败，请核对实际状态"), cancelled: i18n.t("已取消")} as any)[action.status]}</span>
                        <h3>{getToolLabels()[action.payload.name] || action.payload.name}</h3>
                        {action.payload.before?.title && <b>{action.payload.before.title}</b>}
                        <OperationPreview action={action} />
                        {action.status === 'pending' && <><p className="chat-muted">{i18n.t("确认在 15 分钟内有效；对象发生变化时需要重新预览。")}</p>
                            <Button disabled={locked} onClick={() => safe(store.stream('confirm', {action: action.id, approve: false}))}>{i18n.t("取消操作")}</Button>
                            <Button type="primary" danger={action.payload.name.endsWith('.delete')} disabled={locked} onClick={() => safe(store.stream('confirm', {action: action.id, approve: true}))}>{i18n.t("确认执行")}</Button></>}
                    </Card>)}<div ref={bottom} /></div>}
            </div>
            <footer className="chat-composer-area">
                {store.error && <Alert type="warning" title={i18n.t(store.error)} closable onClose={() => {store.error = ''}} />}
                {!models.length ? <div className="chat-connect"><h3>{i18n.t("连接你的 AI 服务商")}</h3><p>{i18n.t("配置完成后，即可开始聊天和管理博客。")}</p><Link to="/options/ai">{i18n.t("前往 AI 连接设置 →")}</Link></div> : <>
                    <input ref={fileInput} type="file" multiple accept={canReadImages ? attachmentAccept : textAttachmentAccept} hidden aria-label={i18n.t("选择聊天附件")} disabled={locked || Boolean(pending)}
                        onChange={event => {
                            const files = Array.from(event.target.files || []); event.target.value = '';
                            safe(addFiles(files));
                        }} />
                    <Suggestion items={getCommands().map(command => ({label: command.label, value: command.description}))}
                        onSelect={value => setInput(value)}>
                        {({onTrigger, onKeyDown, open}) => <Sender className="chat-composer" value={input} components={senderComponents}
                            placeholder={pending ? i18n.t("请先确认或取消上方操作") : i18n.t("帮我写文章、整理内容或管理博客… 输入 / 查看快捷指令")}
                            autoSize={{minRows: inConversation ? 2 : 3, maxRows: 8}} disabled={pending ? true : undefined} allowSpeech
                            header={attachments.length > 0 && <div className="chat-draft-header">
                                <DraftAttachments files={attachments} disabled={locked} remove={index => setAttachments(files => files.filter((_, i) => i !== index))} />
                            </div>}
                            loading={sending || store.busy || Boolean(store.session?.active_run)}
                            onChange={value => {setInput(value); onTrigger(value === '/' ? {} : false)}}
                            onKeyDown={event => {onKeyDown(event); if (open && event.key === 'Enter') return false; return undefined}}
                            onPaste={canReadImages ? pasteImages : undefined}
                            onSubmit={() => safe(send())} onCancel={() => safe(store.stop())} suffix={false}
                            footer={(_, {components: {SendButton, LoadingButton, SpeechButton}}) => <div className="chat-composer-toolbar">
                                <Tooltip title={canReadImages
                                    ? i18n.t("添加图片或文件：最多 5 个附件；PNG/JPEG/WebP 静态图片每张 2 MiB、共 4 MiB、最长边 4096；文本每个 32 KiB、共 64 KiB。发送后交给所选 AI 服务商，随私有会话保存。不支持 PDF、Office。")
                                    : i18n.t("添加文本文件：最多 5 个，每个 32 KiB、共 64 KiB。发送后交给所选 AI 服务商，随私有会话保存。不支持 PDF、Office。")}>
                                    <Button type="text" aria-label={canReadImages ? i18n.t("添加图片或文件") : i18n.t("添加文件")} icon={<PaperClipOutlined />} loading={readingFiles}
                                        disabled={locked || Boolean(pending)} onClick={() => fileInput.current?.click()} />
                                </Tooltip>
                                {models.find(model => model.value === selected)?.tools && <small className="chat-skill-status chat-muted">{i18n.t("博客技能已启动")}</small>}
                                <div className="chat-composer-actions">
                                    <Select aria-label={i18n.t("聊天模型")} placeholder={i18n.t("选择模型")} variant="borderless" value={selected} options={models} disabled={locked || Boolean(pending)}
                                        onChange={value => safe((async() => {if (!store.session) {const created = await store.create(); await store.open(created); assignDraftSession(created)}
                                            const [provider, model] = JSON.parse(value); await store.mutate('select', {provider, model});})())} />
                                    <Tooltip title={i18n.t("语音输入（需浏览器支持并允许麦克风权限）")}>
                                        <SpeechButton aria-label={i18n.t("语音输入")} disabled={locked || pending ? true : undefined} />
                                    </Tooltip>
                                    {sending || store.busy || store.session?.active_run ? <LoadingButton disabled={false} aria-label={i18n.t("停止生成")} icon={<StopOutlined />} /> :
                                        <SendButton className="chat-send-button" type="primary" aria-label={i18n.t("发送消息")} icon={<ArrowUpOutlined />} disabled={(!input.trim() && !attachments.length) || Boolean(pending) || !selected || locked || (needsVision && !canReadImages)} />}
                                </div>
                            </div>} />}
                    </Suggestion>
                    {!inConversation && <Prompts className="chat-suggestions" wrap
                        items={getCommands().map(command => ({...command, disabled: locked, description: undefined}))}
                        onItemClick={({data}) => setInput(getCommands().find(command => command.key === data.key)!.description)} />}
                    <small className="chat-footnote">{i18n.t("AI 可能出错，请核对文章内容和操作结果。")}</small>
                </>}
            </footer>
            {!inConversation && children && <div className="chat-overview-details">{children}</div>}
        </main>
        <aside className={`chat-history-shell${historyOpen ? ' is-open' : ''}`}>
            <button type="button" className="chat-history-toggle" aria-label={historyOpen ? i18n.t("收起会话列表") : i18n.t("展开会话列表")}
                aria-expanded={historyOpen} aria-controls="overview-chat-history" onClick={() => setHistoryOpen(open => !open)}>
                <CaretLeftOutlined className="chat-history-toggle-icon" />
            </button>
            <div id="overview-chat-history" className="chat-history-panel" aria-hidden={!historyOpen} inert={!historyOpen}>
                {conversations}
            </div>
        </aside>
        <Modal title={i18n.t("重命名对话")} okText={i18n.t("保存")} cancelText={i18n.t("取消")} open={Boolean(renaming)} onCancel={() => setRenaming('')} onOk={() => safe(store.manage(renaming, 'rename', {title}).then(() => setRenaming('')))}><Input aria-label={i18n.t("对话标题")} value={title} maxLength={100} onChange={event => setTitle(event.target.value)} /></Modal>
    </section></XProvider>;
}
export default observer(Chat);
