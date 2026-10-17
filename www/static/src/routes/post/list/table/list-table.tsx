import * as React from 'react';
import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Table, Button, Checkbox, Input, Radio, Select, Space, message } from 'antd';
import './list-table.less';
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

@inject('postStore', 'sharedStore')
@observer
class PostListTable extends React.Component<PostListProps, PostListTableState> {
    state: PostListTableState = {
        categoryIds: [], tags: [],
        editCategories: false, editTags: false, editVisibility: false, isPublic: 1,
        editPassword: false, postPassword: '',
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

    runBulk = () => {
        const changes: Record<string, any> = {};
        if (this.state.editCategories) {
            changes.cate = this.state.categoryIds.map(id => ({id}));
        }
        if (this.state.editTags) changes.tag = this.state.tags;
        if (this.state.editVisibility) changes.is_public = this.state.isPublic;
        if (this.state.editPassword) {
            if (this.state.postPassword) changes.post_password = this.state.postPassword;
            else changes.clear_post_password = 1;
        }
        if (this.state.editPermission) {
            changes.allow_comment = this.state.allowComment;
        }
        if (this.state.editAuthor) changes.user_id = this.state.userId;
        if (!Object.keys(changes).length) {
            message.warning('请选择要更新的内容');
            return Promise.reject(new Error('请选择要更新的内容'));
        }
        if (this.state.editAuthor && !this.state.userId) {
            message.warning('请选择作者');
            return Promise.reject(new Error('请选择作者'));
        }
        return new Promise<void>((resolve, reject) => {
            const ids = this.props.postStore.selectedRowKeys.map(Number);
            this.props.postStore.bulkPost('edit', ids, changes).subscribe(
                res => {
                    if (res.errno !== 0) {
                        const error = new Error(res.errmsg || '批量操作失败');
                        message.error(error.message);
                        this.props.postStore.setLoading(false);
                        reject(error);
                        return;
                    }
                    message.success(`已处理 ${ids.length} 篇文章`);
                    this.setState({
                        categoryIds: [], tags: [],
                        editCategories: false, editTags: false, editVisibility: false, isPublic: 1,
                        editPassword: false, postPassword: '',
                        editPermission: false, allowComment: 1, editAuthor: false, userId: undefined
                    });
                    this.props.postStore.setSelectedRowKeys([]);
                    this.props.postStore.setBulkEditOpen(false);
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
        const { postList, loading, pagination, selectedRowKeys, bulkEditOpen } = this.props.postStore;
        const {sharedStore} = this.props;
        return (
            <>
            <Table
                dataSource={postList}
                loading={{spinning: loading, delay: TABLE_DELAY}}
                pagination={pagination}
                rowSelection={{
                    selectedRowKeys,
                    onChange: keys => this.props.postStore.setSelectedRowKeys(keys)
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
                title={`批量编辑 ${selectedRowKeys.length} 篇文章`}
                open={bulkEditOpen}
                okText="更新"
                cancelText="取消"
                confirmLoading={loading}
                onCancel={() => this.props.postStore.setBulkEditOpen(false)}
                onOk={this.runBulk}
            >
                <div className="bulk-edit-field">
                    <Checkbox
                        checked={this.state.editCategories}
                        onChange={event => this.setState({editCategories: event.target.checked})}
                    >更新分类</Checkbox>
                    <Select
                        mode="multiple"
                        disabled={!this.state.editCategories}
                        value={this.state.categoryIds}
                        onChange={values => this.setState({categoryIds: values.map(Number)})}
                        options={sharedStore.categoryList.map(cat => ({label: cat.name, value: cat.id}))}
                        placeholder="请选择分类"
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
                    <Radio.Group
                        disabled={!this.state.editVisibility}
                        value={this.state.isPublic}
                        onChange={event => this.setState({isPublic: event.target.value})}
                    >
                        <Radio value={1}>公开</Radio>
                        <Radio value={0}>不公开</Radio>
                    </Radio.Group>
                </div>
                <div className="bulk-edit-field">
                    <Checkbox
                        checked={this.state.editPassword}
                        onChange={event => this.setState({editPassword: event.target.checked})}
                    >更新访问密码</Checkbox>
                    <Input.Password
                        disabled={!this.state.editPassword}
                        value={this.state.postPassword}
                        maxLength={256}
                        placeholder="输入新的访问密码"
                        onChange={event => this.setState({postPassword: event.target.value})}
                    />
                    <div className="bulk-edit-help">勾选更新后，留空将取消所选文章的密码保护。</div>
                </div>
                <div className="bulk-edit-field">
                    <Checkbox
                        checked={this.state.editPermission}
                        onChange={event => this.setState({editPermission: event.target.checked})}
                    >更新权限控制</Checkbox>
                    <Checkbox
                        className="bulk-edit-option"
                        disabled={!this.state.editPermission}
                        checked={Boolean(this.state.allowComment)}
                        onChange={event => this.setState({allowComment: event.target.checked ? 1 : 0})}
                    >允许评论</Checkbox>
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
                        options={sharedStore.userList
                            .filter(user => Number(user.type) !== 4)
                            .map(user => ({label: user.name, value: user.id}))}
                    />
                </div>}
            </Modal>
            </>
        );
    }
}

export default PostListTable;
