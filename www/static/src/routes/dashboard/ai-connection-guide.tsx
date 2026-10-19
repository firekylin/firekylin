import * as React from 'react';
import { Modal, message } from 'antd';

type Client = 'chatgpt' | 'claude' | 'claudecode' | 'codex' | 'other';

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
    { id: 'claudecode', label: 'Claude Code', steps: [
        '复制完整配置提示词发送给 Claude Code，安装官方 Skill 并配置 MCP。',
        '如无法自动配置，请按官方 Skill 文档手动安装目录并添加远程 MCP。',
        '按照客户端提示完成 Firekylin OAuth 授权。',
        '调用 posts.list 验证是否可以读取真实文章。'
    ] },
    { id: 'codex', label: 'Codex', steps: [
        '复制完整配置提示词发送给 Codex，安装官方 Skill 并配置 MCP。',
        '如自动配置失败，可手动执行下方 codex mcp add 命令。',
        '运行 codex mcp login firekylin，并完成浏览器中的 OAuth 授权。',
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
    const supportsSkill = client === 'codex' || client === 'claudecode';
    const installPrompt = available && supportsSkill ? [
        '请帮我在当前 AI 编码客户端中配置 Firekylin 博客管理能力：',
        '',
        '1. 从官方仓库安装 Firekylin Skill：',
        '   https://github.com/firekylin/firekylin/tree/master/skills/firekylin',
        '   确保包含 SKILL.md、references、scripts，并验证能够加载。',
        '2. 配置远程 Streamable HTTP MCP，名称 firekylin，地址：',
        '   ' + endpoint,
        '3. 引导我通过 Firekylin 官方 OAuth 页面登录并授权。',
        '   不要让我在聊天中提供 Access Token、Cookie 或其他密钥。',
        '4. 授权后调用 posts.list 读取最近五篇文章，验证连接。',
        '',
        '如果当前客户端无法自动安装或修改 MCP 配置，请说明限制，',
        '给出手动步骤。不要声称未经验证的连接已成功。'
    ].join('\\n') : '';

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
                {client === 'chatgpt' && <p className="alert alert-info">
                    普通 ChatGPT 对话不能仅凭提示词安装仓库 Skill；请按照上述步骤连接 MCP。
                </p>}
                {client === 'claude' && <p className="alert alert-info">
                    此处为 Claude 远程连接器。如果使用 Claude Code，请选择“Claude Code”查看 Skill 安装方法。
                </p>}
                {supportsSkill && available && <>
                    <label htmlFor="firekylin-install-prompt">让 AI 帮我安装 Skill 与 MCP</label>
                    <textarea id="firekylin-install-prompt" className="form-control" readOnly
                        value={installPrompt} rows={11} style={{ resize: 'vertical', marginBottom: 8 }}/>
                    <button className="btn btn-primary" type="button"
                        onClick={() => copy(installPrompt)}>复制完整配置提示词</button>
                    <p style={{ marginTop: 12 }}>
                        <a href="https://github.com/firekylin/firekylin/tree/master/skills/firekylin"
                            target="_blank" rel="noopener noreferrer">Firekylin Skill 安装说明</a>
                    </p>
                </>}
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
