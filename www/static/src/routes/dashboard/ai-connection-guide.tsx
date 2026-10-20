import * as React from 'react';
import { Modal, message } from 'antd';

type Client = 'codex' | 'claudecode' | 'other';

const SKILL_URL = 'https://github.com/firekylin/firekylin/tree/master/skills/firekylin';

const CLIENTS: {
    id: Client;
    label: string;
    steps: string[];
    prompt: string;
}[] = [
    {
        id: 'codex',
        label: 'Codex',
        steps: [
            '复制下方提示词，发送给 Codex。',
            '确认安装来自 Firekylin 官方仓库的完整 Skill。',
            '安装完成后，让 Codex 使用 Firekylin Skill 连接博客。',
            '按提示输入博客地址，并在浏览器中完成登录授权。'
        ],
        prompt: [
            '请使用 $skill-installer 从 Firekylin 官方仓库安装 firekylin Skill：',
            SKILL_URL,
            '',
            '请安装 skills/firekylin 完整目录，不要只复制 SKILL.md，',
            '并保留其中的 references 和 scripts。',
            '安装完成后加载 $firekylin，引导我连接并验证自己的博客。'
        ].join('\n')
    },
    {
        id: 'claudecode',
        label: 'Claude Code',
        steps: [
            '复制下方提示词，发送给 Claude Code。',
            '确认安装来自 Firekylin 官方仓库的完整 Skill。',
            '安装完成后，让 Claude Code 使用 Firekylin Skill 连接博客。',
            '按提示输入博客地址，并在浏览器中完成登录授权。'
        ],
        prompt: [
            '请从 Firekylin 官方仓库安装 firekylin Skill：',
            SKILL_URL,
            '',
            '请将 skills/firekylin 完整目录安装到当前项目支持的 Skill 目录，',
            '不要只复制 SKILL.md，并保留其中的 references 和 scripts。',
            '安装完成后加载 firekylin Skill，引导我连接并验证自己的博客。'
        ].join('\n')
    },
    {
        id: 'other',
        label: '其他客户端',
        steps: [
            '确认你的 AI 客户端支持 Agent Skills。',
            '按照客户端文档安装下方链接中的完整 Skill 目录。',
            '加载 Firekylin Skill，并让它连接你的博客。',
            '按提示输入博客地址，并在浏览器中完成登录授权。'
        ],
        prompt: [
            '请按照当前客户端的 Agent Skills 安装方式，从官方仓库安装 firekylin Skill：',
            SKILL_URL,
            '',
            '请安装 skills/firekylin 完整目录，不要只复制 SKILL.md，',
            '并保留其中的 references 和 scripts。',
            '安装完成后加载 firekylin Skill，引导我连接并验证自己的博客。'
        ].join('\n')
    }
];

export default function AIConnectionGuide() {
    const [visible, setVisible] = React.useState(false);
    const [client, setClient] = React.useState<Client>('codex');
    const details = CLIENTS.find(item => item.id === client)!;

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
            <h4 style={{ marginTop: 0 }}>用 AI 管理博客</h4>
            <p>安装 Firekylin 博客管理 Skill，用自然语言搜索文章、创建草稿和查看评论。</p>
            <button className="btn btn-primary" type="button" onClick={() => setVisible(true)}>
                安装博客管理 Skill
            </button>
            <Modal title="安装 Firekylin 博客管理 Skill" open={visible} footer={null}
                onCancel={() => setVisible(false)} width={620}>
                <p>选择你使用的 AI 客户端，然后按步骤完成安装。</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {CLIENTS.map(item => (
                        <button key={item.id} type="button"
                            className={'btn ' + (client === item.id ? 'btn-primary' : 'btn-default')}
                            aria-pressed={client === item.id}
                            onClick={() => setClient(item.id)}>{item.label}</button>
                    ))}
                </div>
                <ol>{details.steps.map(step => <li key={step} style={{ marginBottom: 8 }}>{step}</li>)}</ol>
                <label htmlFor="firekylin-install-prompt">发送给 {details.label}</label>
                <textarea id="firekylin-install-prompt" className="form-control" readOnly
                    value={details.prompt} rows={9} style={{ resize: 'vertical', marginBottom: 8 }}/>
                <button className="btn btn-primary" type="button"
                    onClick={() => copy(details.prompt)}>复制安装提示词</button>
                <p style={{ marginTop: 12 }}>
                    <a href={SKILL_URL} target="_blank" rel="noopener noreferrer">
                        查看 Skill 文件和手动安装说明
                    </a>
                </p>
                <p style={{ marginTop: 16, color: '#777' }}>
                    连接过程中只需提供博客地址，并在 Firekylin 官方页面登录授权。
                    请勿在聊天中发送密码、Cookie 或访问令牌。
                </p>
            </Modal>
        </section>
    );
}
