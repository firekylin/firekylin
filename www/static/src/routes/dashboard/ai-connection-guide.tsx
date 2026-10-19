import * as React from 'react';
import { Modal, message } from 'antd';

type Client = 'chatgpt' | 'claude' | 'codex' | 'other';

const CLIENTS: { id: Client; label: string; steps: string[] }[] = [
    { id: 'chatgpt', label: 'ChatGPT', steps: [
        '在 ChatGPT 的插件设置中选择添加自定义 MCP 服务（需要客户端支持该功能）。',
        '将下方 MCP 地址粘贴到服务器地址中并保存。',
        '按照客户端提示跳转到 Firekylin 登录并确认 OAuth 授权。',
        '返回对话，尝试“列出我博客最近的五篇文章”。'
    ] },
    { id: 'claude', label: 'Claude', steps: [
        '打开 Claude 的连接器设置，选择添加自定义远程连接器。',
        '填入下方 MCP 地址，并按照客户端提示完成连接。',
        '在 Firekylin 登录和确认 OAuth 授权。',
        '在 Claude 中请求列出最近的文章，确认工具能够调用。'
    ] },
    { id: 'codex', label: 'Codex', steps: [
        '在终端执行下方 codex mcp add 命令。',
        '运行 codex mcp login firekylin，并完成浏览器中的 OAuth 授权。',
        '可按仓库 README 的说明安装 Firekylin Skill，辅助 Codex 理解博客工作流。',
        '让 Codex 调用 posts.list 验证连接。'
    ] },
    { id: 'other', label: '其他客户端', steps: [
        '确保 AI 客户端支持远程 Streamable HTTP MCP 和 OAuth。',
        '将下方 MCP 地址作为服务器地址添加。',
        '通过客户端完成 OAuth 登录及授权，然后调用 posts.list 验证。'
    ] }
];

function normalizedSiteUrl(siteUrl?: string) {
    if (!siteUrl) return '';
    try {
        const url = new URL(siteUrl);
        if (url.protocol !== 'https:' && !(url.protocol === 'http:' &&
            ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) return '';
        if (url.username || url.password || url.search || url.hash) return '';
        return url.origin;
    } catch {
        return '';
    }
}

export default function AIConnectionGuide({ siteUrl, enabled }: {siteUrl?: string; enabled?: boolean}) {
    const [visible, setVisible] = React.useState(false);
    const [client, setClient] = React.useState<Client>('chatgpt');
    const origin = normalizedSiteUrl(siteUrl);
    const endpoint = origin ? origin + '/mcp' : '';
    const available = enabled !== false && !!endpoint;
    const details = CLIENTS.find(item => item.id === client)!;
    const command = endpoint ? 'codex mcp add firekylin --url ' + endpoint : '';

    const copy = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            message.success('已复制');
        } catch {
            message.error('复制失败，请手动选择文本复制');
        }
    };

    return (
        <section className="ai-connection-guide" style={{
            margin: '24px 0', padding: '20px 24px', border: '1px solid #e8e8e8',
            borderRadius: 8, background: '#fafafa'
        }}>
            <h4 style={{ marginTop: 0 }}>连接 AI 助手</h4>
            <p>连接 ChatGPT、Claude 或 Codex，用自然语言搜索文章、创建草稿和查看评论。</p>
            <button className="btn btn-primary" type="button" onClick={() => setVisible(true)}>
                连接 AI
            </button>
            <Modal title="连接 Firekylin 到 AI 助手" open={visible} footer={null}
                onCancel={() => setVisible(false)} width={620}>
                <p>选择你使用的客户端，按步骤添加 Firekylin 的 MCP 服务。</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {CLIENTS.map(item => (
                        <button key={item.id} type="button"
                            className={'btn ' + (client === item.id ? 'btn-primary' : 'btn-default')}
                            aria-pressed={client === item.id}
                            onClick={() => setClient(item.id)}>{item.label}</button>
                    ))}
                </div>
                {enabled === false && <p className="alert alert-warning">
                    MCP 服务已禁用，请先在 Firekylin 服务配置中启用 MCP。
                </p>}
                {!endpoint && <p className="alert alert-warning">
                    博客站点地址未配置为有效的 HTTPS URL（本地 localhost 可以使用 HTTP）。
                    请检查后台的 site_url 设置。
                </p>}
                {available && <>
                    <label htmlFor="firekylin-mcp-url">MCP 服务地址</label>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <input id="firekylin-mcp-url" className="form-control" readOnly value={endpoint}/>
                        <button className="btn btn-default" type="button" onClick={() => copy(endpoint)}>复制</button>
                    </div>
                </>}
                <ol>{details.steps.map(step => <li key={step} style={{ marginBottom: 8 }}>{step}</li>)}</ol>
                {client === 'codex' && available && <>
                    <label htmlFor="firekylin-codex-command">Codex MCP 配置命令</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input id="firekylin-codex-command" className="form-control" readOnly value={command}/>
                        <button className="btn btn-default" type="button" onClick={() => copy(command)}>复制</button>
                    </div>
                    <p style={{ marginTop: 12 }}>
                        <a href="https://github.com/firekylin/firekylin/tree/master/skills/firekylin"
                            target="_blank" rel="noopener noreferrer">查看 Firekylin Skill 安装说明</a>
                    </p>
                </>}
                <p style={{ marginTop: 16, color: '#777' }}>
                    连接需要由 AI 客户端发起 OAuth 授权；这里展示的状态只检查站点配置，
                    不能代表客户端已成功连接。部分客户端或账号可能暂不支持自定义 MCP。
                </p>
            </Modal>
        </section>
    );
}
