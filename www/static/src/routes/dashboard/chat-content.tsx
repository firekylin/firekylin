import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import {ChatAttachments} from './chat-attachments';
import React from 'react';
import {Actions, Bubble, Sources, Think, ThoughtChain} from '@ant-design/x';
import {XMarkdown, type ComponentProps} from '@ant-design/x-markdown';
import {Alert, Button, Card, Tag} from 'antd';
import {RobotOutlined, UserOutlined} from '@ant-design/icons';
import {Link} from '../../utils/router';

export const getToolLabels = (): Record<string, string> => ({
    'posts.list_managed': i18n.t("查找文章"), 'posts.get_managed': i18n.t("读取文章"), 'posts.publish': i18n.t("发布文章"),
    'posts.delete': i18n.t("永久删除文章"), 'posts.update': i18n.t("修改文章"), 'posts.create_draft': i18n.t("创建草稿"),
    'posts.update_draft': i18n.t("修改草稿"), 'comments.list': i18n.t("查看评论"), 'comments.moderate': i18n.t("处理评论"),
    'comments.approve': i18n.t("批准评论"), 'comments.update': i18n.t("修改评论"), 'comments.create': i18n.t("发表评论"),
    'settings.get': i18n.t("读取站点设置"), 'settings.update': i18n.t("修改站点设置"),
    'categories.list': i18n.t("查看分类"), 'tags.list': i18n.t("查看标签")
});
export const getCommands = () => ([
    {key: 'write', label: i18n.t("写新文章"), description: i18n.t("帮我写一篇新文章，先讨论选题")},
    {key: 'drafts', label: i18n.t("查找草稿"), description: i18n.t("查找最近的草稿")},
    {key: 'taxonomy', label: i18n.t("分类与标签"), description: i18n.t("查看博客分类和标签")},
    {key: 'comments', label: i18n.t("审核评论"), description: i18n.t("查看待审核的评论")}
]);
const LazyHighlighter = React.lazy(() => import('@ant-design/x/es/code-highlighter'));
function ChatCode({lang, children}: {lang: string; children: string}) {
    useTranslation('admin');
    return <React.Suspense fallback={<pre>{children}</pre>}><LazyHighlighter lang={lang} prismLightMode={false}>{children}</LazyHighlighter></React.Suspense>;
}
function MarkdownCode({children, block, lang}: ComponentProps) {
    useTranslation('admin');
    const text = String(children ?? '').replace(/\n$/, '');
    return block ? <ChatCode lang={lang?.split(/\s/)[0] || 'text'}>{text}</ChatCode> : <code>{children}</code>;
}
const markdownConfig = {breaks: true, gfm: true};
const markdownComponents = {
    pre: ({children}: ComponentProps) => <>{children}</>,
    code: MarkdownCode,
    // Chat has no image attachment flow; avoid third-party image requests from model text.
    img: ({alt}: ComponentProps) => <span>{String(alt || i18n.t("图片"))}</span>,
    a: ({children, href}: ComponentProps) => <a href={typeof href === 'string' && /^(https?:\/\/|\/(?!\/)|#)/i.test(href) ? href : undefined}
        target="_blank" rel="noopener noreferrer">{children}</a>
};
export function Markdown({text, streaming = false}: {text: string; streaming?: boolean}) {
    useTranslation('admin');
    return <XMarkdown className="chat-markdown" content={text || ''} config={markdownConfig} escapeRawHtml components={markdownComponents}
        streaming={{hasNextChunk: streaming, incompleteMarkdown: 'complete'}} />;
}
function parsed(content: string) { try { return JSON.parse(content) } catch { return null } }
export function ExecutionChain({entry, actions, messages, running}: any) {
    useTranslation('admin');
    return <ThoughtChain className="chat-execution-chain" items={(entry.toolCalls || []).map((call: any) => {
        const action = actions.find((item: any) => item.payload.callId === call.id);
        const response = messages.find((item: any) => item.role === 'tool' && item.toolCallId === call.id);
        const result = response ? parsed(response.content) : null;
        const state = result?.error ? 'failed' : result?.cancelled ? 'cancelled' : response ? 'completed' : action?.status;
        const status = state === 'completed' ? 'success' : state === 'failed' ? 'error' :
            ['cancelled', 'interrupted'].includes(state) ? 'abort' : running || state === 'pending' ? 'loading' : 'abort';
        return {key: call.id, title: getToolLabels()[call.name] || call.name, status,
            description: ({pending: i18n.t("等待用户确认"), executing: i18n.t("执行中"), ready: i18n.t("准备执行"), completed: i18n.t("已完成"),
                failed: i18n.t("未完成"), cancelled: i18n.t("已取消"), interrupted: i18n.t("已中断，请核对实际状态")} as any)[state] || (running ? i18n.t("正在准备") : i18n.t("未收到执行结果")),
            collapsible: true, content: <ChatCode lang="json">{JSON.stringify(call.input, null, 2)}</ChatCode>};
    })} />;
}
export function GenerationStatus({status}: {status: string}) {
    useTranslation('admin');
    const tool = status.startsWith('正在执行 ') ? status.slice('正在执行 '.length) : '';
    const title = tool
        ? i18n.t('正在执行 {{tool}}', {tool: getToolLabels()[tool] || tool})
        : status === '正在思考'
            ? i18n.t('正在生成回复')
            : i18n.t(status || '正在连接模型');
    return <div role="status"><Think loading title={title} defaultExpanded={false}>
        {i18n.t('正在等待模型回复或执行博客工具，具体结果会记录在对话中。')}
    </Think></div>;
}
export function ToolResult({entry, preview}: any) {
    useTranslation('admin');
    const result = parsed(entry.content);
    if (!result) return null;
    if (result.error) return <Alert type="error" showIcon title={i18n.t(String(result.error))} />;
    if (result.cancelled) return <Bubble.System content={i18n.t("操作已取消")} />;
    const rows = Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : result.post ? [result.post] : result.id ? [result] : [];
    const postRows = entry.name?.startsWith('posts.') && entry.name !== 'posts.delete'
        ? rows.filter((row: any) => Number.isSafeInteger(Number(row.id)) && Number(row.id) > 0) : [];
    return <Card size="small" className="chat-result" title={i18n.t("{{value0}} · 已完成", {value0: getToolLabels()[entry.name] || entry.name})}>
        {rows.map((row: any, index: number) => <div className="chat-result-row" key={row.id || index}>
            <div><b>{row.title || row.name || row.nick || `#${row.id}`}</b>
                {row.status !== undefined && <Tag>{({0: i18n.t("草稿"), 1: i18n.t("待审核"), 2: i18n.t("已拒绝"), 3: i18n.t("已发布"), 4: i18n.t("回收站")} as any)[row.status] || row.status}</Tag>}
                {row.comment && <p>{String(row.comment).replace(/<[^>]*>/g, '').slice(0, 160)}</p>}
            </div>
            {postRows.includes(row) && <Button size="small" onClick={() => preview(row)}>{i18n.t("预览")}</Button>}
            {entry.name?.startsWith('posts.') && row.id && entry.name !== 'posts.delete' && <Link to={`/post/edit/${row.id}`}>{i18n.t("修改内容")}</Link>}
        </div>)}
        {postRows.length > 0 && <Sources title={i18n.t("相关博客资料")} items={postRows.map((row: any) => ({
            key: String(row.id), title: row.title || i18n.t("文章 #{{value0}}", {value0: row.id}),
            url: typeof row.url === 'string' && /^\/(?![\/\\])/.test(row.url) ? row.url : `/admin/post/edit/${Number(row.id)}`,
            description: row.summary || i18n.t("来自本次博客工具返回的文章记录")
        }))} />}
        {!rows.length && <Think title={i18n.t("查看操作结果")} defaultExpanded={false}>
            <ChatCode lang="json">{JSON.stringify(result, null, 2)}</ChatCode>
        </Think>}
    </Card>;
}
export function ChatMessage({entry, actions, messages, running, preview, retry, locked, streaming = false}: any) {
    useTranslation('admin');
    if (entry.role === 'tool') return <ToolResult entry={entry} preview={preview} />;
    if (entry.role === 'error') return <Alert type="error" showIcon title={i18n.t(entry.content)}
        action={<Button size="small" disabled={locked} onClick={retry}>{i18n.t("重试回复")}</Button>} />;
    if (entry.role === 'event') {
        const prefix = '模型已切换为 ';
        const content = entry.content.startsWith(prefix)
            ? i18n.t('模型已切换为 {{model}}', {model: entry.content.slice(prefix.length)})
            : i18n.t(entry.content);
        return <Bubble.System content={content} />;
    }
    const isUser = entry.role === 'user';
    return <Bubble placement={isUser ? 'end' : 'start'} variant={isUser ? 'filled' : 'borderless'}
        streaming={streaming} avatar={isUser ? <UserOutlined /> : <RobotOutlined />} header={isUser ? i18n.t("你") : 'Firekylin'}
        content={<>{isUser && entry.attachments?.length > 0 && <ChatAttachments files={entry.attachments} />}{entry.content && <Markdown text={entry.content} streaming={streaming} />}
            {entry.toolCalls && <ExecutionChain entry={entry} actions={actions} messages={messages} running={running} />}</>}
        footer={!isUser && entry.content && !streaming ? <Actions items={[{key: 'copy', label: i18n.t("复制"),
            actionRender: <Actions.Copy text={entry.content} />}]} /> : undefined} />;
}
