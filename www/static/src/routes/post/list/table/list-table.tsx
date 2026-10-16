import * as React from 'react';
import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Table, Button, Checkbox, Select, Space, message } from 'antd';
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
}

@inject('postStore', 'sharedStore')
@observer
class PostListTable extends React.Component<PostListProps, PostListTableState> {
    state: PostListTableState = {
        selectedRowKeys: [], bulkAction: '', editOpen: false, categoryIds: [], tags: [],
        editCategories: false, editTags: false
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
        const changes: {cate?: {id: number}[]; tag?: string[]} = {};
        if (operation === 'edit' && this.state.editCategories) {
            changes.cate = this.state.categoryIds.map(id => ({id}));
        }
        if (operation === 'edit' && this.state.editTags) changes.tag = this.state.tags;
        if (operation === 'edit' && !this.state.editCategories && !this.state.editTags) {
            message.warning('请选择要更新的内容');
            return Promise.reject(new Error('请选择要更新的内容'));
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
                        editCategories: false, editTags: false
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
            </Modal>
            </>
        );
    }
}

export default PostListTable;
