import React from 'react';
import {
    Button,
    Alert,
    Tabs,
    message,
    Form,
    FormInstance,
    Input,
    InputNumber,
    Select,
    Switch,
} from 'antd';
import { inject, observer } from '@admin/utils/mobx-react';
import BreadCrumb from '../../../components/breadcrumb';
import './comment.less';
import {http} from '../../../utils/http';
import { CommentProps, CommentState } from './comment.model';

const { TextArea } = Input;
const META_OPTIONS = [
    { value: 'nick', label: '昵称' },
    { value: 'mail', label: '邮箱' },
    { value: 'link', label: '网址' },
];

function lines(value: any): string[] {
    if (Array.isArray(value))
        return value
            .map(String)
            .map((item) => item.trim())
            .filter(Boolean);
    return String(value || '')
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean);
}
function createCommentState() {
    let comment = window.SysConfig.options.comment;
    try {
        if (typeof comment === 'string') comment = JSON.parse(comment);
    } catch {
        comment = {};
    }
    comment = comment && typeof comment === 'object' ? comment : {};
    const wordLimit = Array.isArray(comment.wordLimit)
        ? comment.wordLimit
        : [0, Number(comment.wordLimit) || 0];
    return {
        submitting: false,
        comment: {
            audit: Boolean(comment.audit), forceLogin: Boolean(comment.forceLogin),
            pageSize: Number(comment.pageSize) || 10, locale: comment.locale || 'zh-CN',
            ipQps: Number(comment.ipQps) || 60, commentSorting: comment.commentSorting || 'latest',
            dark: comment.dark || false,
            meta: Array.isArray(comment.meta) ? comment.meta : ['nick', 'mail', 'link'],
            requiredMeta: Array.isArray(comment.requiredMeta) ? comment.requiredMeta : [],
            wordLimitMin: Number(wordLimit[0]) || 0, wordLimitMax: Number(wordLimit[1]) || 0,
            emoji: comment.emoji !== false,
            emojiPresets: Array.isArray(comment.emoji) ? comment.emoji.join('\n') : '',
            reaction: Boolean(comment.reaction),
            reactionImages: Array.isArray(comment.reaction) ? comment.reaction.join('\n') : '',
            imageUploader: comment.imageUploader !== false, highlighter: comment.highlighter !== false,
            texRenderer: comment.texRenderer !== false, search: comment.search !== false,
            noCopyright: Boolean(comment.noCopyright), noRss: Boolean(comment.noRss),
            forbiddenWords: lines(comment.forbiddenWords).join('\n'),
            disallowIPList: lines(comment.disallowIPList).join('\n'),
            likeIncMax: Number(comment.likeIncMax) || 1, levels: lines(comment.levels).join(', '),
            avatarProxy: comment.avatarProxy || '',
            smtpHost: comment.smtpHost || '', smtpPort: comment.smtpPort || 465,
            smtpSecure: comment.smtpSecure !== false, smtpUser: comment.smtpUser || '',
            smtpFrom: comment.smtpFrom || '', authorEmail: comment.authorEmail || '',
            mailNotify: Boolean(comment.mailNotify),
        },
    };
}
const SECTION_KEYS: Record<string, string[]> = {"basic": ["audit", "forceLogin", "pageSize", "locale", "ipQps"], "display": ["commentSorting", "dark", "meta", "requiredMeta", "wordLimit", "emoji", "reaction", "imageUploader", "highlighter", "texRenderer", "search", "noCopyright", "noRss"], "mail": ["mailNotify", "smtpHost", "smtpPort", "smtpSecure", "smtpUser", "smtpPass", "smtpFrom", "authorEmail"], "security": ["forbiddenWords", "disallowIPList", "likeIncMax", "levels", "avatarProxy"]};

function CommentForm(props: CommentProps) {
    const [activeTab, setActiveTab] = React.useState('basic');
    const activeTabRef = React.useRef(activeTab);
    activeTabRef.current = activeTab;
    const [testRecipient, setTestRecipient] = React.useState('');
    const [testing, setTesting] = React.useState(false);
    const [testResult, setTestResult] = React.useState<{ok: boolean; text: string} | null>(null);

    const [state, setState] = React.useState(createCommentState);
    const legacyRef = React.useRef({});
    const legacy = legacyRef.current as any;
    legacy.state = state;
    legacy.setState = (update: any, callback?: () => void) => {
        setState((previous: any) => {
            const next = {
                ...previous,
                ...(typeof update === 'function' ? update(previous, props) : update),
            };
            legacy.state = next;
            return next;
        });
        if (callback) queueMicrotask(callback);
    };
    if (!legacy.__initialized) {
        legacy.__initialized = true;
        legacy.formRef = React.createRef<FormInstance>();
        legacy.handleSubmit = (values: any) => {
            const min = Math.max(0, Number(values.wordLimitMin) || 0);
            const rawMax = Math.max(0, Number(values.wordLimitMax) || 0);
            const max = rawMax && rawMax < min ? min : rawMax;
            const emojiPresets = lines(values.emojiPresets);
            const reactionImages = lines(values.reactionImages).slice(0, 6);
            const meta = values.meta || [];
            const config: Record<string, any> = {
                smtpPass: values.smtpPass || '',
                smtpHost: values.smtpHost, smtpPort: values.smtpPort, smtpSecure: values.smtpSecure,
                smtpUser: values.smtpUser, smtpFrom: values.smtpFrom, authorEmail: values.authorEmail,
                mailNotify: Boolean(values.mailNotify),
                audit: Boolean(values.audit),
                forceLogin: Boolean(values.forceLogin),
                pageSize: values.pageSize,
                locale: values.locale,
                ipQps: values.ipQps,
                commentSorting: values.commentSorting,
                dark: values.dark,
                meta,
                requiredMeta: (values.requiredMeta || []).filter((item: string) =>
                    meta.includes(item),
                ),
                wordLimit: min ? [min, max] : max,
                emoji: values.emoji
                    ? emojiPresets.length
                        ? emojiPresets
                        : true
                    : false,
                reaction: values.reaction
                    ? reactionImages.length
                        ? reactionImages
                        : true
                    : false,
                imageUploader: Boolean(values.imageUploader),
                highlighter: Boolean(values.highlighter),
                texRenderer: Boolean(values.texRenderer),
                search: Boolean(values.search),
                noCopyright: Boolean(values.noCopyright),
                noRss: Boolean(values.noRss),
                forbiddenWords: lines(values.forbiddenWords),
                disallowIPList: lines(values.disallowIPList),
                likeIncMax: values.likeIncMax,
                levels: lines(values.levels).map(Number).filter(Number.isFinite),
                avatarProxy: String(values.avatarProxy || '').trim(),
            };
            props.commentStore.commentSave(Object.fromEntries(SECTION_KEYS[activeTabRef.current].map(key => [key, config[key]])));
        };
    }
    legacy.render = function render() {
        const { comment, submitting } = legacy.state;
        return (
            <>
                <BreadCrumb className="breadcrumb" {...props} />
                <div className="page-list">
                    <h3 className="page-title">评论设置</h3>
                    <div className="option-comment-page">
                        <Form
                            ref={legacy.formRef}
                            onFinish={legacy.handleSubmit}
                            layout="vertical"
                        >
                            <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
                                {key: 'basic', label: '基本设置', forceRender: true, children: <>
                            <Form.Item
                                label="评论需要审核"
                                name="audit"
                                valuePropName="checked"
                                initialValue={comment.audit}
                            >
                                <Switch />
                            </Form.Item>
                            <Form.Item
                                label="必须登录后评论"
                                name="forceLogin"
                                valuePropName="checked"
                                initialValue={comment.forceLogin}
                            >
                                <Switch />
                            </Form.Item>
                            <Form.Item
                                label="每页评论数"
                                name="pageSize"
                                initialValue={comment.pageSize}
                                rules={[{ required: true }]}
                            >
                                <InputNumber min={1} max={100} />
                            </Form.Item>
                            <Form.Item
                                label="界面语言"
                                name="locale"
                                initialValue={comment.locale}
                            >
                                <Select
                                    options={[
                                        { value: 'zh-CN', label: '简体中文' },
                                        { value: 'zh-TW', label: '繁體中文' },
                                        { value: 'en', label: 'English' },
                                        { value: 'jp', label: '日本語' },
                                        { value: 'pt-BR', label: 'Português' },
                                        { value: 'ru', label: 'Русский' },
                                        { value: 'fr-FR', label: 'Français' },
                                        { value: 'de', label: 'Deutsch' },
                                    ]}
                                />
                            </Form.Item>
                            <Form.Item
                                label="同 IP 评论间隔（秒）"
                                name="ipQps"
                                initialValue={comment.ipQps}
                            >
                                <InputNumber min={1} max={3600} />
                            </Form.Item>

                                </>},
                                {key: 'display', label: '展示与交互', forceRender: true, children: <>

                            <Form.Item
                                label="默认排序"
                                name="commentSorting"
                                initialValue={comment.commentSorting}
                            >
                                <Select
                                    options={[
                                        { value: 'latest', label: '最新' },
                                        { value: 'oldest', label: '最早' },
                                        { value: 'hottest', label: '最热' },
                                    ]}
                                />
                            </Form.Item>
                            <Form.Item
                                label="深色模式"
                                name="dark"
                                initialValue={comment.dark}
                            >
                                <Select
                                    options={[
                                        { value: false, label: '关闭' },
                                        { value: 'auto', label: '跟随系统' },
                                    ]}
                                />
                            </Form.Item>
                            <Form.Item
                                label="评论者资料栏"
                                name="meta"
                                initialValue={comment.meta}
                            >
                                <Select mode="multiple" options={META_OPTIONS} />
                            </Form.Item>
                            <Form.Item
                                label="匿名评论必填资料"
                                name="requiredMeta"
                                initialValue={comment.requiredMeta}
                                extra="登录用户不受此项限制"
                            >
                                <Select mode="multiple" options={META_OPTIONS} />
                            </Form.Item>
                            <div className="option-comment-row">
                                <Form.Item
                                    label="最少字数"
                                    name="wordLimitMin"
                                    initialValue={comment.wordLimitMin}
                                >
                                    <InputNumber min={0} max={10000} />
                                </Form.Item>
                                <Form.Item
                                    label="最多字数"
                                    name="wordLimitMax"
                                    initialValue={comment.wordLimitMax}
                                    extra="0 表示不限制"
                                >
                                    <InputNumber min={0} max={10000} />
                                </Form.Item>
                            </div>
                            <Form.Item
                                label="启用表情"
                                name="emoji"
                                valuePropName="checked"
                                initialValue={comment.emoji}
                            >
                                <Switch />
                            </Form.Item>
                            <Form.Item
                                label="自定义表情预设地址"
                                name="emojiPresets"
                                initialValue={comment.emojiPresets}
                                extra="每行一个地址；留空使用 Waline 默认表情"
                            >
                                <TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
                            </Form.Item>
                            <Form.Item
                                label="启用文章互动"
                                name="reaction"
                                valuePropName="checked"
                                initialValue={comment.reaction}
                            >
                                <Switch />
                            </Form.Item>
                            <Form.Item
                                label="自定义互动图片"
                                name="reactionImages"
                                initialValue={comment.reactionImages}
                                extra="每行一个图片地址，最多 6 个；留空使用默认图标"
                            >
                                <TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
                            </Form.Item>
                            <Form.Item
                                label="允许图片上传"
                                name="imageUploader"
                                valuePropName="checked"
                                initialValue={comment.imageUploader}
                            >
                                <Switch />
                            </Form.Item>
                            <Form.Item
                                label="代码高亮"
                                name="highlighter"
                                valuePropName="checked"
                                initialValue={comment.highlighter}
                            >
                                <Switch />
                            </Form.Item>
                            <Form.Item
                                label="数学公式渲染"
                                name="texRenderer"
                                valuePropName="checked"
                                initialValue={comment.texRenderer}
                            >
                                <Switch />
                            </Form.Item>
                            <Form.Item
                                label="GIF 搜索"
                                name="search"
                                valuePropName="checked"
                                initialValue={comment.search}
                            >
                                <Switch />
                            </Form.Item>
                            <Form.Item
                                label="隐藏版权提示"
                                name="noCopyright"
                                valuePropName="checked"
                                initialValue={comment.noCopyright}
                            >
                                <Switch />
                            </Form.Item>
                            <Form.Item
                                label="隐藏评论 RSS"
                                name="noRss"
                                valuePropName="checked"
                                initialValue={comment.noRss}
                            >
                                <Switch />
                            </Form.Item>

                                </>},
                                {key: 'mail', label: '邮件通知', forceRender: true, children: <>

                            <Form.Item label="评论邮件通知" name="mailNotify" valuePropName="checked" initialValue={comment.mailNotify} extra="新评论通知站长邮箱，已通过审核的回复通知被回复者">
                                <Switch />
                            </Form.Item>
                            <Form.Item label="SMTP 服务器" name="smtpHost" initialValue={comment.smtpHost}><Input /></Form.Item>
                            <Form.Item label="SMTP 用户名" name="smtpUser" initialValue={comment.smtpUser}><Input /></Form.Item>
                            <Form.Item label="发件人邮箱" name="smtpFrom" initialValue={comment.smtpFrom}><Input /></Form.Item>
                            <Form.Item label="站长收件邮箱" name="authorEmail" initialValue={comment.authorEmail}><Input /></Form.Item>
                            <Form.Item label="SMTP 端口" name="smtpPort" initialValue={comment.smtpPort}><InputNumber min={1} max={65535} /></Form.Item>
                            <Form.Item label="直接 TLS" name="smtpSecure" valuePropName="checked" initialValue={comment.smtpSecure} extra="465 端口开启；587/STARTTLS 关闭"><Switch /></Form.Item>
                            <Form.Item label="SMTP 密码" name="smtpPass" extra="留空保留已保存的密码；输入新值可替换"><Input.Password autoComplete="new-password" /></Form.Item>

                            <Form.Item label="测试收件邮箱" extra="使用当前填写的配置发送；密码留空时使用已保存的密码，无需先保存。">
                                <Input value={testRecipient} onChange={event => setTestRecipient(event.target.value)} />
                            </Form.Item>
                            <Button loading={testing} disabled={testing} onClick={() => {
                                if (!testRecipient.trim()) {message.error('请填写测试收件邮箱'); return;}
                                setTesting(true); setTestResult(null);
                                const values = legacy.formRef.current.getFieldsValue(true);
                                const config = Object.fromEntries(SECTION_KEYS.mail.map(key => [key, values[key]]));
                                http.post<{message: string}>('/admin/api/options?type=testCommentMail', {config, recipient: testRecipient.trim()}, {timeout: 40000}).subscribe({
                                    next: result => {setTesting(false); setTestResult({ok: result.errno === 0, text: result.errno === 0 ? result.data.message : String(result.errmsg || '发送失败')});},
                                    error: () => {setTesting(false); setTestResult({ok: false, text: '请求失败或超时，请检查邮件服务和网络后重试'});},
                                });
                            }}>发送测试邮件</Button>
                            {testResult && <Alert style={{marginTop: 16}} type={testResult.ok ? 'success' : 'error'} showIcon title={testResult.ok ? '测试邮件已发送' : '测试发送失败'} description={testResult.text} />}

                                </>},
                                {key: 'security', label: '安全与用户', forceRender: true, children: <>

                            <Form.Item
                                label="敏感词"
                                name="forbiddenWords"
                                initialValue={comment.forbiddenWords}
                                extra="每行一个词，命中的评论会进入垃圾评论"
                            >
                                <TextArea autoSize={{ minRows: 3, maxRows: 8 }} />
                            </Form.Item>
                            <Form.Item
                                label="IP 黑名单"
                                name="disallowIPList"
                                initialValue={comment.disallowIPList}
                                extra="每行一个完整 IP 地址"
                            >
                                <TextArea autoSize={{ minRows: 3, maxRows: 8 }} />
                            </Form.Item>
                            <Form.Item
                                label="单次点赞随机增量上限"
                                name="likeIncMax"
                                initialValue={comment.likeIncMax}
                            >
                                <InputNumber min={1} max={100} />
                            </Form.Item>
                            <Form.Item
                                label="用户等级阈值"
                                name="levels"
                                initialValue={comment.levels}
                                extra="按评论数量填写，以逗号分隔，例如 0, 10, 50, 100"
                            >
                                <Input />
                            </Form.Item>
                            <Form.Item
                                label="头像代理地址"
                                name="avatarProxy"
                                initialValue={comment.avatarProxy}
                                extra="留空表示直接加载头像；代理需接受 url 查询参数"
                            >
                                <Input placeholder="https://example.com/avatar-proxy" />
                            </Form.Item>

                                </>},
                            ]} />
                            <Form.Item>
                                <Button
                                    type="primary"
                                    onClick={() => legacy.formRef.current.validateFields(SECTION_KEYS[activeTab]).then(() => legacy.handleSubmit(legacy.formRef.current.getFieldsValue(true)))}
                                    loading={submitting}
                                >
                                    保存当前标签页
                                </Button>
                            </Form.Item>
                        </Form>
                    </div>
                </div>
            </>
        );
    };
    return legacy.render();
}

export default inject('commentStore')(observer(CommentForm));
