import {ChatAttachments} from './chat-attachments';
import React from 'react';
import {Actions, Bubble, Sources, Think, ThoughtChain} from '@ant-design/x';
import {XMarkdown, type ComponentProps} from '@ant-design/x-markdown';
import {Alert, Button, Card, Tag} from 'antd';
import {RobotOutlined, UserOutlined} from '@ant-design/icons';
import {Link} from '../../utils/router';

export const toolLabels: Record<string, string> = {
    'posts.list_managed': '查找文章', 'posts.get_managed': '读取文章', 'posts.publish': '发布文章',
    'posts.delete': '永久删除文章', 'posts.update': '修改文章', 'posts.create_draft': '创建草稿',
    'posts.update_draft': '修改草稿', 'comments.list': '查看评论', 'comments.moderate': '处理评论',
    'comments.approve': '批准评论', 'comments.update': '修改评论', 'comments.create': '发表评论',
    'settings.get': '读取站点设置', 'settings.update': '修改站点设置',
    'categories.list': '查看分类', 'tags.list': '查看标签'
};
export const commands = [
    {key: 'write', label: '写新文章', description: '帮我写一篇新文章，先讨论选题'},
    {key: 'drafts', label: '查找草稿', description: '查找最近的草稿'},
    {key: 'taxonomy', label: '分类与标签', description: '查看博客分类和标签'},
    {key: 'comments', label: '审核评论', description: '查看待审核的评论'}
];
const LazyHighlighter = React.lazy(() => import('@ant-design/x/es/code-highlighter'));
function ChatCode({lang, children}: {lang: string; children: string}) {
    return <React.Suspense fallback={<pre>{children}</pre>}><LazyHighlighter lang={lang} prismLightMode={false}>{children}</LazyHighlighter></React.Suspense>;
}
function MarkdownCode({children, block, lang}: ComponentProps) {
    const text = String(children ?? '').replace(/\n$/, '');
    return block ? <ChatCode lang={lang?.split(/\s/)[0] || 'text'}>{text}</ChatCode> : <code>{children}</code>;
}
const markdownConfig = {breaks: true, gfm: true};
const markdownComponents = {
    pre: ({children}: ComponentProps) => <>{children}</>,
    code: MarkdownCode,
    // Chat has no image attachment flow; avoid third-party image requests from model text.
    img: ({alt}: ComponentProps) => <span>{String(alt || '图片')}</span>,
    a: ({children, href}: ComponentProps) => <a href={typeof href === 'string' && /^(https?:\/\/|\/(?!\/)|#)/i.test(href) ? href : undefined}
        target="_blank" rel="noopener noreferrer">{children}</a>
};
export function Markdown({text, streaming = false}: {text: string; streaming?: boolean}) {
    return <XMarkdown className="chat-markdown" content={text || ''} config={markdownConfig} escapeRawHtml components={markdownComponents}
        streaming={{hasNextChunk: streaming, incompleteMarkdown: 'complete'}} />;
}
function parsed(content: string) { try { return JSON.parse(content) } catch { return null } }
export function ExecutionChain({entry, actions, messages, running}: any) {
    return <ThoughtChain className="chat-execution-chain" items={(entry.toolCalls || []).map((call: any) => {
        const action = actions.find((item: any) => item.payload.callId === call.id);
        const response = messages.find((item: any) => item.role === 'tool' && item.toolCallId === call.id);
        const result = response ? parsed(response.content) : null;
        const state = result?.error ? 'failed' : result?.cancelled ? 'cancelled' : response ? 'completed' : action?.status;
        const status = state === 'completed' ? 'success' : state === 'failed' ? 'error' :
            ['cancelled', 'interrupted'].includes(state) ? 'abort' : running || state === 'pending' ? 'loading' : 'abort';
        return {key: call.id, title: toolLabels[call.name] || call.name, status,
            description: ({pending: '等待用户确认', executing: '执行中', ready: '准备执行', completed: '已完成',
                failed: '未完成', cancelled: '已取消', interrupted: '已中断，请核对实际状态'} as any)[state] || (running ? '正在准备' : '未收到执行结果'),
            collapsible: true, content: <ChatCode lang="json">{JSON.stringify(call.input, null, 2)}</ChatCode>};
    })} />;
}
export function GenerationStatus({status}: {status: string}) {
    return <div role="status"><Think loading title={status === '正在思考' ? '正在生成回复' : status || '正在连接模型'} defaultExpanded={false}>
        正在等待模型回复或执行博客工具，具体结果会记录在对话中。
    </Think></div>;
}
export function ToolResult({entry, preview}: any) {
    const result = parsed(entry.content);
    if (!result) return null;
    if (result.error) return <Alert type="error" showIcon title={result.error} />;
    if (result.cancelled) return <Bubble.System content="操作已取消" />;
    const rows = Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : result.post ? [result.post] : result.id ? [result] : [];
    const postRows = entry.name?.startsWith('posts.') && entry.name !== 'posts.delete'
        ? rows.filter((row: any) => Number.isSafeInteger(Number(row.id)) && Number(row.id) > 0) : [];
    return <Card size="small" className="chat-result" title={`${toolLabels[entry.name] || entry.name} · 已完成`}>
        {rows.map((row: any, index: number) => <div className="chat-result-row" key={row.id || index}>
            <div><b>{row.title || row.name || row.nick || `#${row.id}`}</b>
                {row.status !== undefined && <Tag>{({0: '草稿', 1: '待审核', 2: '已拒绝', 3: '已发布', 4: '回收站'} as any)[row.status] || row.status}</Tag>}
                {row.comment && <p>{String(row.comment).replace(/<[^>]*>/g, '').slice(0, 160)}</p>}
            </div>
            {postRows.includes(row) && <Button size="small" onClick={() => preview(row)}>预览</Button>}
            {entry.name?.startsWith('posts.') && row.id && entry.name !== 'posts.delete' && <Link to={`/post/edit/${row.id}`}>修改内容</Link>}
        </div>)}
        {postRows.length > 0 && <Sources title="相关博客资料" items={postRows.map((row: any) => ({
            key: String(row.id), title: row.title || `文章 #${row.id}`,
            url: typeof row.url === 'string' && /^\/(?![\/\\])/.test(row.url) ? row.url : `/admin/post/edit/${Number(row.id)}`,
            description: row.summary || '来自本次博客工具返回的文章记录'
        }))} />}
        {!rows.length && <Think title="查看操作结果" defaultExpanded={false}>
            <ChatCode lang="json">{JSON.stringify(result, null, 2)}</ChatCode>
        </Think>}
    </Card>;
}
export function ChatMessage({entry, actions, messages, running, preview, retry, locked, streaming = false}: any) {
    if (entry.role === 'tool') return <ToolResult entry={entry} preview={preview} />;
    if (entry.role === 'error') return <Alert type="error" showIcon title={entry.content}
        action={<Button size="small" disabled={locked} onClick={retry}>重试回复</Button>} />;
    if (entry.role === 'event') return <Bubble.System content={entry.content} />;
    const isUser = entry.role === 'user';
    return <Bubble placement={isUser ? 'end' : 'start'} variant={isUser ? 'filled' : 'borderless'}
        streaming={streaming} avatar={isUser ? <UserOutlined /> : <RobotOutlined />} header={isUser ? '你' : 'Firekylin'}
        content={<>{isUser && entry.attachments?.length > 0 && <ChatAttachments files={entry.attachments} />}{entry.content && <Markdown text={entry.content} streaming={streaming} />}
            {entry.toolCalls && <ExecutionChain entry={entry} actions={actions} messages={messages} running={running} />}</>}
        footer={!isUser && entry.content && !streaming ? <Actions items={[{key: 'copy', label: '复制',
            actionRender: <Actions.Copy text={entry.content} />}]} /> : undefined} />;
}
