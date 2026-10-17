import * as React from 'react';
import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Table, Button, Checkbox, Input, Select, Space, message } from 'antd';
import './list-table.less';
import { observer, inject } from '@admin/utils/mobx-react';
import { Link } from '../../../../utils/router';
import { Modal } from 'antd';
import { PostListProps } from '../list.model';
import { TABLE_DELAY } from '../../../../config';

const confirm = Modal.confirm;

interface PostListTableState {
    selectedRowKeys: React.Key[];
    bulkAction: string;
    editOpen: boolean;
    categoryIds: number[];
    tags: string[];
    editCategories: boolean;
    editTags: boolean;
    editVisibility: boolean;
    isPublic: number;
    editPassword: boolean;
    passwordAction: 'set' | 'clear';
    postPassword: string;
    editPermission: boolean;
    allowComment: number;
    editAuthor: boolean;
    userId?: number;
}

@inject('postStore', 'sharedStore')
@observer
class PostListTable extends React.Component<PostListProps, PostListTableState> {
    state: PostListTableState = {
        selectedRowKeys: [], bulkAction: '', editOpen: false, categoryIds: [], tags: [],
        editCategories: false, editTags: false, editVisibility: false, isPublic: 1,
        editPassword: false, passwordAction: 'set', postPassword: '',
        editPermission: false, allowComment: 1, editAuthor: false
    };

    delete(id: number, force: boolean = false) {
        confirm({
            title: '提示',
            content: `确定${force ? '彻底' : ''}删除吗?`,
            onOk: () => {
                this.props.postStore.deletePostById(id, force);
            }
        });
    }

    cancel(id: number) {
        this.props.postStore.cancelPostById(id);
    }

    pass(id: number) {
        this.props.postStore.passPostById(id);
    }

    refuse(id: number) {
        this.props.postStore.refusePostById(id);
    }

    applyBulk = (): void => {
        const {selectedRowKeys, bulkAction} = this.state;
        if (!selectedRowKeys.length) {
            message.warning('请先选择文章');
            return;
        }
        if (!bulkAction) {
            message.warning('请选择批量操作');
            return;
        }
        if (bulkAction === 'edit') {
            this.setState({editOpen: true});
            return;
        }
        const force = bulkAction === 'forceDelete';
        confirm({
            title: '提示',
            content: `确定${force ? '永久删除' : '将'}选中的 ${selectedRowKeys.length} 篇文章${force ? '' : '移入回收站'}吗？`,
            onOk: () => this.runBulk(force ? 'forceDelete' : 'delete')
        });
    }

    runBulk = (operation: 'edit' | 'delete' | 'forceDelete') => {
        const changes: Record<string, any> = {};
        if (operation === 'edit' && this.state.editCategories) {
            changes.cate = this.state.categoryIds.map(id => ({id}));
        }
        if (operation === 'edit' && this.state.editTags) changes.tag = this.state.tags;
        if (operation === 'edit' && this.state.editVisibility) changes.is_public = this.state.isPublic;
        if (operation === 'edit' && this.state.editPassword) {
            if (this.state.passwordAction === 'clear') changes.clear_post_password = 1;
            else changes.post_password = this.state.postPassword;
        }
        if (operation === 'edit' && this.state.editPermission) {
            changes.allow_comment = this.state.allowComment;
        }
        if (operation === 'edit' && this.state.editAuthor) changes.user_id = this.state.userId;
        if (operation === 'edit' && !Object.keys(changes).length) {
            message.warning('请选择要更新的内容');
            return Promise.reject(new Error('请选择要更新的内容'));
        }
        if (operation === 'edit' && this.state.editPassword &&
            this.state.passwordAction === 'set' && !this.state.postPassword) {
            message.warning('请输入访问密码');
            return Promise.reject(new Error('请输入访问密码'));
        }
        if (operation === 'edit' && this.state.editAuthor && !this.state.userId) {
            message.warning('请选择作者');
            return Promise.reject(new Error('请选择作者'));
        }
        return new Promise<void>((resolve, reject) => {
            this.props.postStore.bulkPost(operation, this.state.selectedRowKeys.map(Number), changes).subscribe(
                res => {
                    if (res.errno !== 0) {
                        const error = new Error(res.errmsg || '批量操作失败');
                        message.error(error.message);
                        this.props.postStore.setLoading(false);
                        reject(error);
                        return;
                    }
                    message.success(`已处理 ${this.state.selectedRowKeys.length} 篇文章`);
                    this.setState({
                        selectedRowKeys: [], bulkAction: '', editOpen: false, categoryIds: [], tags: [],
                        editCategories: false, editTags: false, editVisibility: false, isPublic: 1,
                        editPassword: false, passwordAction: 'set', postPassword: '',
                        editPermission: false, allowComment: 1, editAuthor: false, userId: undefined
                    });
                    this.props.postStore.getPostList();
                    resolve();
                },
                err => {
                    message.error(err instanceof Error ? err.message : String(err));
                    this.props.postStore.setLoading(false);
                    reject(err);
                }
            );
        });
    }

    renderActions(post: any) {
        const status = (this.props.postStore.plReqParams.status as string);
        if (status === '' || status === '0') {
            return <Space size="small">
                <Button onClick={() => this.props.history.push(`/post/edit/${post.id}`)} type="primary" icon={<EditOutlined />} size="small">编辑</Button>
                <Button onClick={() => this.delete(post.id)} type="primary" danger icon={<DeleteOutlined />} size="small">删除</Button>
            </Space>;
        } else if(status === '4') {
            return <Space size="small">
                <Button onClick={() => this.cancel(post.id)} type="primary" icon={<EditOutlined />} size="small">撤销</Button>
                <Button onClick={() => this.delete(post.id, true)} type="primary" danger icon={<DeleteOutlined />} size="small">删除</Button>
            </Space>;
        } else {
            return <Space size="small">
                <Button disabled={status === '3'} onClick={() => this.pass(post.id)} className="fk-btn-success" icon={<CheckOutlined />} size="small">通过</Button>
                <Button disabled={status === '2'} onClick={() => this.refuse(post.id)} type="primary" danger icon={<CloseOutlined />} size="small">拒绝</Button>
            </Space>;
        }
    }

    render() {
        const Column = Table.Column;
        const { postList, loading, pagination, plReqParams } = this.props.postStore;
        const {sharedStore} = this.props;
        const inTrash = String(plReqParams.status) === '4';
        return (
            <>
            <div className="bulk-actions">
                <Select
                    value={this.state.bulkAction}
                    onChange={bulkAction => this.setState({bulkAction})}
                    options={inTrash ? [
                        {value: '', label: '批量操作'}, {value: 'forceDelete', label: '永久删除'}
                    ] : [
                        {value: '', label: '批量操作'}, {value: 'edit', label: '编辑'}, {value: 'delete', label: '移入回收站'}
                    ]}
                />
                <Button onClick={this.applyBulk} disabled={!this.state.selectedRowKeys.length}>应用</Button>
                {!!this.state.selectedRowKeys.length && <span>已选择 {this.state.selectedRowKeys.length} 项</span>}
            </div>
            <Table
                dataSource={postList}
                loading={{spinning: loading, delay: TABLE_DELAY}}
                pagination={pagination}
                rowSelection={{
                    selectedRowKeys: this.state.selectedRowKeys,
                    onChange: selectedRowKeys => this.setState({selectedRowKeys})
                }}
                onChange={e => {
                    this.props.postStore.setPlReqParams({
                        page: e.current,
                        pageSize: e.pageSize
                    });
                }}
            >
                <Column
                    title="标题"
                    key="title"
                    render={(post) => (
                        <>
                            <Link to={`/post/edit/${post.id}`}>{post.title}</Link>
                            {/* 当文章为公开且发布状态时渲染文章链接 */}
                            {
                                post.status === 3 && post.is_public
                                    ?
                                    <a
                                        href={`/post/${post.pathname}.html`}
                                        target="_blank"
                                        className="admin-post-link"
                                    >
                                        <span className="glyphicon glyphicon-link" />
                                    </a>
                                    :
                                    null
                            }
                        </>
                    )}
                />
                <Column
                    title="作者"
                    dataIndex="author"
                    key="author"
                />
                <Column
                    title="状态"
                    dataIndex="statusText"
                    key="statusText"
                />
                <Column
                    title="发布日期"
                    dataIndex="create_time"
                    key="create_time"
                />
                <Column
                    title="操作"
                    key="action"
                    render={post => this.renderActions(post)}
                />
            </Table>
            <Modal
                title={`批量编辑 ${this.state.selectedRowKeys.length} 篇文章`}
                open={this.state.editOpen}
                okText="更新"
                cancelText="取消"
                confirmLoading={loading}
                onCancel={() => this.setState({editOpen: false})}
                onOk={() => this.runBulk('edit')}
            >
                <div className="bulk-edit-field">
                    <Checkbox
                        checked={this.state.editCategories}
                        onChange={event => this.setState({editCategories: event.target.checked})}
                    >更新分类</Checkbox>
                    <Checkbox.Group
                        disabled={!this.state.editCategories}
                        value={this.state.categoryIds}
                        onChange={values => this.setState({categoryIds: values.map(Number)})}
                        options={sharedStore.categoryList.map(cat => ({label: cat.name, value: cat.id}))}
                    />
                </div>
                <div className="bulk-edit-field">
                    <Checkbox
                        checked={this.state.editTags}
                        onChange={event => this.setState({editTags: event.target.checked})}
                    >更新标签</Checkbox>
                    <Select
                        disabled={!this.state.editTags}
                        mode="tags"
                        value={this.state.tags}
                        onChange={tags => this.setState({tags})}
                        options={sharedStore.tagList.map(tag => ({label: tag.name, value: tag.name}))}
                        placeholder="选择或输入标签"
                        style={{width: '100%'}}
                    />
                </div>
                <div className="bulk-edit-field">
                    <Checkbox
                        checked={this.state.editVisibility}
                        onChange={event => this.setState({editVisibility: event.target.checked})}
                    >更新公开度</Checkbox>
                    <Select
                        disabled={!this.state.editVisibility}
                        value={this.state.isPublic}
                        onChange={isPublic => this.setState({isPublic})}
                        options={[{label: '公开', value: 1}, {label: '不公开', value: 0}]}
                    />
                </div>
                <div className="bulk-edit-field">
                    <Checkbox
                        checked={this.state.editPassword}
                        onChange={event => this.setState({editPassword: event.target.checked})}
                    >更新访问密码</Checkbox>
                    <div className="bulk-edit-row">
                        <Select
                            disabled={!this.state.editPassword}
                            value={this.state.passwordAction}
                            onChange={passwordAction => this.setState({passwordAction})}
                            options={[{label: '设置密码', value: 'set'}, {label: '取消密码保护', value: 'clear'}]}
                        />
                        {this.state.passwordAction === 'set' && <Input.Password
                            disabled={!this.state.editPassword}
                            value={this.state.postPassword}
                            maxLength={256}
                            placeholder="输入新的访问密码"
                            onChange={event => this.setState({postPassword: event.target.value})}
                        />}
                    </div>
                </div>
                <div className="bulk-edit-field">
                    <Checkbox
                        checked={this.state.editPermission}
                        onChange={event => this.setState({editPermission: event.target.checked})}
                    >更新权限控制</Checkbox>
                    <Select
                        disabled={!this.state.editPermission}
                        value={this.state.allowComment}
                        onChange={allowComment => this.setState({allowComment})}
                        options={[{label: '允许评论', value: 1}, {label: '禁止评论', value: 0}]}
                    />
                </div>
                {window.SysConfig.userInfo.type === 1 && <div className="bulk-edit-field">
                    <Checkbox
                        checked={this.state.editAuthor}
                        onChange={event => this.setState({editAuthor: event.target.checked})}
                    >更新作者</Checkbox>
                    <Select
                        showSearch={true}
                        disabled={!this.state.editAuthor}
                        value={this.state.userId}
                        onChange={userId => this.setState({userId})}
                        optionFilterProp="label"
                        placeholder="选择作者"
                        options={sharedStore.userList.map(user => ({label: user.name, value: user.id}))}
                    />
                </div>}
            </Modal>
            </>
        );
    }
}

export default PostListTable;
