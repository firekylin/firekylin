import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import * as React from 'react';
import {
    CheckOutlined,
    CloseOutlined,
    DeleteOutlined,
    EditOutlined,
} from '@ant-design/icons';
import { Table, Button, Checkbox, Input, Radio, Select, Space, message } from 'antd';
import './list-table.less';
import PostAccessIndicator from './post-access-indicator';
import { observer, inject } from '@admin/utils/mobx-react';
import { Link } from '../../../../utils/router';
import { Modal } from 'antd';
import { PostListProps } from '../list.model';
import { TABLE_DELAY } from '../../../../config';

const confirm = Modal.confirm;

interface PostListTableState {
    categoryIds: number[];
    tags: string[];
    editCategories: boolean;
    editTags: boolean;
    editVisibility: boolean;
    isPublic: number;
    editPassword: boolean;
    postPassword: string;
    editPermission: boolean;
    allowComment: number;
    editAuthor: boolean;
    userId?: number;
}
function PostListTable(props: PostListProps) {
    useTranslation('admin');
    const [state, setState] = React.useState(() => ({
        categoryIds: [],
        tags: [],
        editCategories: false,
        editTags: false,
        editVisibility: false,
        isPublic: 1,
        editPassword: false,
        postPassword: '',
        editPermission: false,
        allowComment: 1,
        editAuthor: false,
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
        legacy.runBulk = () => {
            const changes: Record<string, any> = {};
            if (legacy.state.editCategories) {
                changes.cate = legacy.state.categoryIds.map((id) => ({ id }));
            }
            if (legacy.state.editTags) changes.tag = legacy.state.tags;
            if (legacy.state.editVisibility) changes.is_public = legacy.state.isPublic;
            if (legacy.state.editPassword) {
                if (legacy.state.postPassword)
                    changes.post_password = legacy.state.postPassword;
                else changes.clear_post_password = 1;
            }
            if (legacy.state.editPermission) {
                changes.allow_comment = legacy.state.allowComment;
            }
            if (legacy.state.editAuthor) changes.user_id = legacy.state.userId;
            if (!Object.keys(changes).length) {
                message.warning(i18n.t("请选择要更新的内容"));
                return Promise.reject(new Error(i18n.t("请选择要更新的内容")));
            }
            if (legacy.state.editAuthor && !legacy.state.userId) {
                message.warning(i18n.t("请选择作者"));
                return Promise.reject(new Error(i18n.t("请选择作者")));
            }
            return new Promise<void>((resolve, reject) => {
                const ids = props.postStore.selectedRowKeys.map(Number);
                props.postStore.bulkPost('edit', ids, changes).subscribe(
                    (res) => {
                        if (res.errno !== 0) {
                            const error = new Error(i18n.t(res.errmsg || '') || i18n.t("批量操作失败"));
                            message.error(i18n.t(error.message || ''));
                            props.postStore.setLoading(false);
                            reject(error);
                            return;
                        }
                        message.success(i18n.t("已处理 {{value0}} 篇文章", {value0: ids.length}));
                        legacy.setState({
                            categoryIds: [],
                            tags: [],
                            editCategories: false,
                            editTags: false,
                            editVisibility: false,
                            isPublic: 1,
                            editPassword: false,
                            postPassword: '',
                            editPermission: false,
                            allowComment: 1,
                            editAuthor: false,
                            userId: undefined,
                        });
                        props.postStore.setSelectedRowKeys([]);
                        props.postStore.setBulkEditOpen(false);
                        props.postStore.getPostList();
                        resolve();
                    },
                    (err) => {
                        message.error(err instanceof Error ? i18n.t(err.message || '') : String(err));
                        props.postStore.setLoading(false);
                        reject(err);
                    },
                );
            });
        };
    }
    legacy.delete = function (id: number, force: boolean = false) {
        confirm({
            title: i18n.t("提示"),
            content: force ? i18n.t('确定彻底删除吗?') : i18n.t('确定删除吗?'),
            onOk: () => {
                props.postStore.deletePostById(id, force);
            },
        });
    };
    legacy.cancel = function cancel(id: number) {
        props.postStore.cancelPostById(id);
    };
    legacy.pass = function pass(id: number) {
        props.postStore.passPostById(id);
    };
    legacy.refuse = function refuse(id: number) {
        props.postStore.refusePostById(id);
    };
    legacy.renderActions = function renderActions(post: any) {
        const status = props.postStore.plReqParams.status as string;
        if (status === '' || status === '0') {
            return (
                <Space size="small">
                    <Button
                        onClick={() => props.history.push(`/post/edit/${post.id}`)}
                        type="primary"
                        icon={<EditOutlined />}
                        size="small"
                    >
                        {i18n.t("编辑")}
                    </Button>
                    <Button
                        onClick={() => legacy.delete(post.id)}
                        type="primary"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                    >
                        {i18n.t("删除")}
                    </Button>
                </Space>
            );
        } else if (status === '4') {
            return (
                <Space size="small">
                    <Button
                        onClick={() => legacy.cancel(post.id)}
                        type="primary"
                        icon={<EditOutlined />}
                        size="small"
                    >
                        {i18n.t("撤销")}
                    </Button>
                    <Button
                        onClick={() => legacy.delete(post.id, true)}
                        type="primary"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                    >
                        {i18n.t("删除")}
                    </Button>
                </Space>
            );
        } else {
            return (
                <Space size="small">
                    <Button
                        disabled={status === '3'}
                        onClick={() => legacy.pass(post.id)}
                        className="fk-btn-success"
                        icon={<CheckOutlined />}
                        size="small"
                    >
                        {i18n.t("通过")}
                    </Button>
                    <Button
                        disabled={status === '2'}
                        onClick={() => legacy.refuse(post.id)}
                        type="primary"
                        danger
                        icon={<CloseOutlined />}
                        size="small"
                    >
                        {i18n.t("拒绝")}
                    </Button>
                </Space>
            );
        }
    };
    legacy.render = function render() {
        const Column = Table.Column;
        const { postList, loading, pagination, selectedRowKeys, bulkEditOpen } =
            props.postStore;
        const { sharedStore } = props;
        return (
            <>
                <Table
                    dataSource={postList}
                    loading={{ spinning: loading, delay: TABLE_DELAY }}
                    pagination={pagination}
                    rowSelection={{
                        selectedRowKeys,
                        onChange: (keys) => props.postStore.setSelectedRowKeys(keys),
                    }}
                    onChange={(e) => {
                        props.postStore.setPlReqParams({
                            page: e.current,
                            pageSize: e.pageSize,
                        });
                    }}
                >
                    <Column
                        title={i18n.t("标题")}
                        key="title"
                        render={(post) => (
                            <>
                                <Link to={`/post/edit/${post.id}`}>{post.title}</Link>
                                <PostAccessIndicator post={post} />
                            </>
                        )}
                    />

                    <Column title={i18n.t("作者")} dataIndex="author" key="author" />

                    <Column title={i18n.t("状态")} dataIndex="statusText" key="statusText" />

                    <Column title={i18n.t("发布日期")} dataIndex="create_time" key="create_time" />

                    <Column
                        title={i18n.t("操作")}
                        key="action"
                        render={(post) => legacy.renderActions(post)}
                    />
                </Table>
                <Modal
                    title={i18n.t("批量编辑 {{value0}} 篇文章", {value0: selectedRowKeys.length})}
                    open={bulkEditOpen}
                    okText={i18n.t("更新")}
                    cancelText={i18n.t("取消")}
                    confirmLoading={loading}
                    onCancel={() => props.postStore.setBulkEditOpen(false)}
                    onOk={legacy.runBulk}
                >
                    <div className="bulk-edit-field">
                        <Checkbox
                            checked={legacy.state.editCategories}
                            onChange={(event) =>
                                legacy.setState({ editCategories: event.target.checked })
                            }
                        >
                            {i18n.t("更新分类")}
                        </Checkbox>
                        <Select
                            mode="multiple"
                            disabled={!legacy.state.editCategories}
                            value={legacy.state.categoryIds}
                            onChange={(values) =>
                                legacy.setState({ categoryIds: values.map(Number) })
                            }
                            options={sharedStore.categoryList.map((cat) => ({
                                label: cat.name,
                                value: cat.id,
                            }))}
                            placeholder={i18n.t("请选择分类")}
                        />
                    </div>
                    <div className="bulk-edit-field">
                        <Checkbox
                            checked={legacy.state.editTags}
                            onChange={(event) =>
                                legacy.setState({ editTags: event.target.checked })
                            }
                        >
                            {i18n.t("更新标签")}
                        </Checkbox>
                        <Select
                            disabled={!legacy.state.editTags}
                            mode="tags"
                            value={legacy.state.tags}
                            onChange={(tags) => legacy.setState({ tags })}
                            options={sharedStore.tagList.map((tag) => ({
                                label: tag.name,
                                value: tag.name,
                            }))}
                            placeholder={i18n.t("选择或输入标签")}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="bulk-edit-field">
                        <Checkbox
                            checked={legacy.state.editVisibility}
                            onChange={(event) =>
                                legacy.setState({ editVisibility: event.target.checked })
                            }
                        >
                            {i18n.t("更新公开度")}
                        </Checkbox>
                        <Radio.Group
                            disabled={!legacy.state.editVisibility}
                            value={legacy.state.isPublic}
                            onChange={(event) =>
                                legacy.setState({ isPublic: event.target.value })
                            }
                        >
                            <Radio value={1}>{i18n.t("公开")}</Radio>
                            <Radio value={0}>{i18n.t("不公开")}</Radio>
                        </Radio.Group>
                    </div>
                    <div className="bulk-edit-field">
                        <Checkbox
                            checked={legacy.state.editPassword}
                            onChange={(event) =>
                                legacy.setState({ editPassword: event.target.checked })
                            }
                        >
                            {i18n.t("更新访问密码")}
                        </Checkbox>
                        <Input.Password
                            disabled={!legacy.state.editPassword}
                            value={legacy.state.postPassword}
                            maxLength={256}
                            placeholder={i18n.t("输入新的访问密码")}
                            onChange={(event) =>
                                legacy.setState({ postPassword: event.target.value })
                            }
                        />

                        <div className="bulk-edit-help">
                            {i18n.t("勾选更新后，留空将取消所选文章的密码保护。")}
                        </div>
                    </div>
                    <div className="bulk-edit-field">
                        <Checkbox
                            checked={legacy.state.editPermission}
                            onChange={(event) =>
                                legacy.setState({ editPermission: event.target.checked })
                            }
                        >
                            {i18n.t("更新权限控制")}
                        </Checkbox>
                        <Checkbox
                            className="bulk-edit-option"
                            disabled={!legacy.state.editPermission}
                            checked={Boolean(legacy.state.allowComment)}
                            onChange={(event) =>
                                legacy.setState({
                                    allowComment: event.target.checked ? 1 : 0,
                                })
                            }
                        >
                            {i18n.t("允许评论")}
                        </Checkbox>
                    </div>
                    {window.SysConfig.userInfo.type === 1 && (
                        <div className="bulk-edit-field">
                            <Checkbox
                                checked={legacy.state.editAuthor}
                                onChange={(event) =>
                                    legacy.setState({ editAuthor: event.target.checked })
                                }
                            >
                                {i18n.t("更新作者")}
                            </Checkbox>
                            <Select
                                showSearch={true}
                                disabled={!legacy.state.editAuthor}
                                value={legacy.state.userId}
                                onChange={(userId) => legacy.setState({ userId })}
                                optionFilterProp="label"
                                placeholder={i18n.t("选择作者")}
                                options={sharedStore.userList
                                    .filter((user) => Number(user.type) !== 4)
                                    .map((user) => ({
                                        label: user.name,
                                        value: user.id,
                                    }))}
                            />
                        </div>
                    )}
                </Modal>
            </>
        );
    };
    return legacy.render();
}

export default inject('postStore', 'sharedStore')(observer(PostListTable));
