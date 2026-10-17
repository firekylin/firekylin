import * as React from 'react';
import { Button, Input, Modal, Select, Space, Table, Tabs, Tag, message } from 'antd';
import BreadCrumb from '../../components/breadcrumb';
import { http } from '../../utils/http';
import firekylin from '../../utils/firekylin';
import './comment.less';

const COMMENT_STATUS: Record<string, { color: string; text: string }> = {
    approved: { color: 'green', text: '已通过' },
    waiting: { color: 'orange', text: '待审核' },
    spam: { color: 'red', text: '垃圾评论' },
};
export default function Comment(props: any) {
    const [state, setState] = React.useState(() => ({
        loading: false,
        data: [],
        total: 0,
        page: 1,
        status: '',
        searchType: 'keyword',
        searchValue: '',
        editing: null,
        content: '',
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
        legacy.search = (searchValue = legacy.state.searchValue) => {
            legacy.setState({ page: 1, searchValue }, () => legacy.load(1));
        };
    }
    legacy.onMount = function onMount() {
        legacy.load();
    };
    legacy.load = function load(page = legacy.state.page, status = legacy.state.status) {
        legacy.setState({ loading: true });
        const { searchType, searchValue } = legacy.state;
        const keyword = searchType === 'keyword' ? searchValue : '';
        const author = searchType === 'author' ? searchValue : '';
        http.get<any>('/admin/api/comment', {
            page,
            pageSize: 20,
            status,
            keyword,
            author,
        }).subscribe((res) => {
            if (res.errno === 0)
                legacy.setState({ ...(res.data as any), status, loading: false });
            else legacy.setState({ loading: false });
        });
    };
    legacy.operate = function operate(id: number, operation: string, comment?: string) {
        http.post('/admin/api/comment', { id, operation, comment }).subscribe((res) => {
            if (res.errno === 0) {
                message.success('操作成功');
                legacy.setState({ editing: null });
                legacy.load();
            }
        });
    };
    legacy.render = function render() {
        const isCommenter = window.SysConfig.userInfo.type === 4;
        const columns: any[] = [
            {
                title: '作者',
                key: 'author',
                width: 250,
                render: (_: any, row: any) => {
                    const avatar = (
                        <img
                            className="comment-author-avatar"
                            src={row.author_avatar}
                            alt={row.author_name}
                        />
                    );
                    const name = (
                        <span className="comment-author-name">{row.author_name}</span>
                    );
                    return (
                        <div className="comment-author">
                            {row.author_link ? (
                                <a
                                    href={row.author_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {avatar}
                                </a>
                            ) : (
                                avatar
                            )}
                            <div className="comment-author-info">
                                {row.author_link ? (
                                    <a
                                        href={row.author_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {name}
                                    </a>
                                ) : (
                                    name
                                )}
                                <span>{row.author_email || '-'}</span>
                                <span>{row.ip || '-'}</span>
                            </div>
                        </div>
                    );
                },
            },
            {
                title: '内容',
                dataIndex: 'comment',
                render: (value: string, row: any) => (
                    <div className="comment-content">
                        <div className="comment-meta">
                            {firekylin.formatTime(row.inserted_at)} 于{' '}
                            <a
                                href={row.post_url}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {row.post_title}
                            </a>
                        </div>
                        <div className="comment-body">{value}</div>
                    </div>
                ),
            },
            {
                title: '状态',
                dataIndex: 'status',
                width: 100,
                render: (value: string) => {
                    const status = COMMENT_STATUS[value] || {
                        color: 'default',
                        text: '未知',
                    };
                    return <Tag color={status.color}>{status.text}</Tag>;
                },
            },
            {
                title: '操作',
                width: 270,
                render: (_: any, row: any) => (
                    <Space wrap>
                        {!isCommenter && row.status !== 'approved' && (
                            <Button
                                size="small"
                                onClick={() => legacy.operate(row.id, 'approved')}
                            >
                                通过
                            </Button>
                        )}
                        {!isCommenter && row.status !== 'spam' && (
                            <Button
                                size="small"
                                danger
                                onClick={() => legacy.operate(row.id, 'spam')}
                            >
                                垃圾
                            </Button>
                        )}
                        <Button
                            size="small"
                            onClick={() =>
                                legacy.setState({ editing: row, content: row.comment })
                            }
                        >
                            编辑
                        </Button>
                        <Button
                            size="small"
                            danger
                            onClick={() =>
                                Modal.confirm({
                                    title: '确定删除这条评论？',
                                    onOk: () => legacy.operate(row.id, 'delete'),
                                })
                            }
                        >
                            删除
                        </Button>
                    </Space>
                ),
            },
        ];

        const table = () => (
            <Table
                rowKey="id"
                columns={columns}
                dataSource={legacy.state.data}
                loading={legacy.state.loading}
                pagination={{
                    current: legacy.state.page,
                    pageSize: 20,
                    total: legacy.state.total,
                    onChange: (page) => {
                        legacy.setState({ page });
                        legacy.load(page);
                    },
                }}
            />
        );
        return (
            <>
                <BreadCrumb className="breadcrumb" {...props} />
                <div className="page-list comment-list">
                    <Tabs
                        className="tabs"
                        type="card"
                        activeKey={legacy.state.status || 'all'}
                        tabBarExtraContent={
                            <div className="comment-search">
                                <Select
                                    value={legacy.state.searchType}
                                    onChange={(searchType) =>
                                        legacy.setState({ searchType })
                                    }
                                >
                                    <Select.Option value="keyword">内容</Select.Option>
                                    <Select.Option value="author">作者</Select.Option>
                                </Select>
                                <Input.Search
                                    placeholder="请输入关键字"
                                    value={legacy.state.searchValue}
                                    onChange={(event) =>
                                        legacy.setState({
                                            searchValue: event.target.value,
                                        })
                                    }
                                    onSearch={legacy.search}
                                    enterButton={true}
                                    allowClear
                                />
                            </div>
                        }
                        onChange={(key) => {
                            const status = key === 'all' ? '' : key;
                            legacy.setState({ page: 1, status });
                            legacy.load(1, status);
                        }}
                        items={[
                            { key: 'all', label: '全部', children: table() },
                            { key: 'waiting', label: '待审核', children: table() },
                            { key: 'spam', label: '垃圾评论', children: table() },
                        ]}
                    />
                </div>
                <Modal
                    title="编辑评论"
                    open={Boolean(legacy.state.editing)}
                    onCancel={() => legacy.setState({ editing: null })}
                    onOk={() =>
                        legacy.operate(
                            legacy.state.editing.id,
                            'edit',
                            legacy.state.content,
                        )
                    }
                >
                    <Input.TextArea
                        rows={8}
                        value={legacy.state.content}
                        onChange={(event) =>
                            legacy.setState({ content: event.target.value })
                        }
                    />
                </Modal>
            </>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
    }, []);
    return legacy.render();
}
