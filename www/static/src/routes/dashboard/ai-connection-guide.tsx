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
        <>
            <button type="button" className="ai-skill-entry"
                title="安装博客管理 Skill" aria-label="安装博客管理 Skill"
                onClick={() => setVisible(true)}
                style={{
                    display: 'block', padding: '15px 12px', border: 0,
                    background: 'transparent', color: '#777', lineHeight: '20px'
                }}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
                    style={{ display: 'block' }}>
                    <path fill="currentColor"
                        d="M12 2l1.45 4.55L18 8l-4.55 1.45L12 14l-1.45-4.55L6 8l4.55-1.45L12 2zm6 11l.95 3.05L22 17l-3.05.95L18 21l-.95-3.05L14 17l3.05-.95L18 13zM5 12l.95 3.05L9 16l-3.05.95L5 20l-.95-3.05L1 16l3.05-.95L5 12z"/>
                </svg>
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
        </>
    );
}
