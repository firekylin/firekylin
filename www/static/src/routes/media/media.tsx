import axios from 'axios';
import AIImage, {saveImage} from '../../components/ai-image';
import * as React from 'react';
import { Button, Tabs, Card, Empty, Input, Modal, Pagination, Space, Upload, message } from 'antd';
import {
    CopyOutlined,
    DeleteOutlined,
    InboxOutlined,
    LinkOutlined,
} from '@ant-design/icons';
import BreadCrumb from '../../components/breadcrumb';
import { http } from '../../utils/http';
import './media.less';

interface Attachment {
    id: number;
    title: string;
    url: string;
    attachment: {
        name: string;
        url: string;
        size: number;
        mime: string;
        storage: string;
    };
}
export default function Media(props: any) {
    const [open, setOpen] = React.useState(false), [tab, setTab] = React.useState('local');
    const [enabled, setEnabled] = React.useState(false), [busy, setBusy] = React.useState(false);
    const [link, setLink] = React.useState(''), [selected, setSelected] = React.useState<any>(null);
    React.useEffect(() => {axios.get('/admin/api/ai-editor').then(r => setEnabled(!!r.data.data?.features?.image)).catch(() => {})}, []);
    const [state, setState] = React.useState(() => ({
        loading: false,
        data: [] as Attachment[],
        total: 0,
        page: 1,
        keyword: '',
    }));
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
    }
    legacy.onMount = function onMount() {
        legacy.load();
    };
    legacy.load = function load(page = legacy.state.page) {
        legacy.setState({ loading: true });
        http.get<any>('/admin/api/attachment', {
            page,
            pageSize: 24,
            images: '1',
            keyword: legacy.state.keyword,
        }).subscribe((res) => {
            if (res.errno === 0) {
                legacy.setState({
                    ...(res.data as any),
                    total: Number(res.data.count) || 0,
                    page,
                    loading: false,
                });
            } else legacy.setState({ loading: false });
        });
    };
    legacy.copy = function copy(value: string) {
        navigator.clipboard.writeText(value).then(() => message.success('链接已复制'));
    };
    legacy.remove = function remove(item: Attachment) {
        Modal.confirm({
            title: `确定删除“${item.title}”？`,
            content:
                item.attachment.storage === 'local'
                    ? '附件记录和本地文件都会被删除，此操作无法撤销。'
                    : '附件记录会被删除；远程存储中的文件需在存储服务中另行删除。',
            onOk: () =>
                http
                    .post(`/admin/api/attachment/${item.id}?method=delete`)
                    .subscribe((res) => {
                        if (res.errno === 0) {
                            message.success('删除成功');
                            legacy.load();
                        }
                    }),
        });
    };
    legacy.renderCard = function renderCard(item: Attachment) {
        const media = item.attachment || ({} as Attachment['attachment']);
        const isImage = (media.mime || '').startsWith('image/');
        return (
            <Card
                key={item.id}
                className="media-card"
                loading={legacy.state.loading}
                cover={
                    isImage ? (
                        <img src={media.url} alt={item.title} loading="lazy" />
                    ) : (
                        <div className="media-file">
                            {(media.name || item.title).split('.').pop()?.toUpperCase()}
                        </div>
                    )
                }
                actions={[
                    <CopyOutlined
                        key="copy"
                        title="复制文件链接"
                        onClick={() => legacy.copy(media.url)}
                    />,
                    <LinkOutlined
                        key="page"
                        title="访问附件页面"
                        onClick={() => window.open(item.url, '_blank')}
                    />,
                    <DeleteOutlined
                        key="delete"
                        title="删除"
                        onClick={() => legacy.remove(item)}
                    />,
                ]}
            >
                <Card.Meta
                    title={item.title}
                    description={
                        <>
                            {media.mime || '未知类型'}
                            {media.size ? ` · ${(media.size / 1024).toFixed(1)} KB` : ''}
                        </>
                    }
                />
            </Card>
        );
    };
    legacy.render = function render() {
        return (
            <>
                <BreadCrumb {...props} />
                <div className="media-page">
                    <Space className="media-toolbar" wrap style={{display: 'flex', justifyContent: 'flex-end'}}>
                        <Input.Search
                            placeholder="按文件名搜索"
                            allowClear
                            enterButton
                            value={legacy.state.keyword}
                            onChange={(event) =>
                                legacy.setState({ keyword: event.target.value })
                            }
                            onSearch={() =>
                                legacy.setState({ page: 1 }, () => legacy.load(1))
                            }
                        />
                        <Button type="primary" onClick={() => {setSelected(null); setLink(''); setTab('local'); setOpen(true)}}>新增媒体</Button>
                    </Space>
                    <Modal title="新增媒体" open={open} destroyOnHidden confirmLoading={busy} closable={!busy} mask={{closable: !busy}} keyboard={!busy} onCancel={() => {if (!busy) setOpen(false)}} okButtonProps={{disabled: busy || (tab === 'ai' && !selected)}} onOk={async() => {
                        setBusy(true);
                        try {
                            if (tab === 'ai') await saveImage(selected);
                            if (tab === 'network') {
                                if (!link.trim()) throw new Error('请输入图片地址');
                                const res = await axios.post('/admin/api/file', {fileUrl: link});
                                if (res.data.errno !== 0) throw new Error(res.data.errmsg || '抓取失败');
                            }
                            setOpen(false); legacy.load(1);
                        } catch(e: any) {message.error(e.message)} finally {setBusy(false)}
                    }}><Tabs activeKey={tab} onChange={key => {if (!busy) setTab(key)}} items={[
                        {key: 'local', label: '本地上传', children: <Upload.Dragger
                            accept="image/*" name="file"
                            action="/admin/api/file"
                            showUploadList={false}
                            multiple={true}
                            onChange={(info) => {
                                if (info.file.status === 'done') {
                                    if (info.file.response.errno === 0) {
                                        message.success(`${info.file.name} 上传成功`);
                                        legacy.load(1);
                                    } else message.error(info.file.response.errmsg);
                                }
                            }}
                        >
                            <InboxOutlined /> 点击或拖放文件到这里上传
                        </Upload.Dragger>},
                        {key: 'network', label: '从网络上抓取', children: <><p>链接地址：</p><Input value={link} onChange={e => setLink(e.target.value)}/></>},
                        ...(enabled ? [{key: 'ai', label: 'AI 生成', children: <AIImage onSelect={setSelected} onBusy={setBusy}/>}]: [])
                    ]}/></Modal>
                    {legacy.state.data.length ? (
                        <div className="media-grid">
                            {legacy.state.data.map((item) => legacy.renderCard(item))}
                        </div>
                    ) : (
                        <Empty description="暂无附件" />
                    )}
                    <Pagination
                        current={legacy.state.page}
                        pageSize={24}
                        total={legacy.state.total}
                        hideOnSinglePage
                        onChange={(page) => {
                            legacy.setState({ page });
                            legacy.load(page);
                        }}
                    />
                </div>
            </>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
    }, []);
    return legacy.render();
}
