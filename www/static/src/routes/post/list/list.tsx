import * as React from 'react';
import './list.less';
import { observer, inject } from '@admin/utils/mobx-react';
import PostListTable from './table/list-table';
import { Button, Form, Input, Modal, Select, Space, Tabs, message } from 'antd';
import { PostListProps } from './list.model';
import BreadCrumb from '../../../components/breadcrumb';
const TabPane = Tabs.TabPane;
const Option = Select.Option;
@inject('postStore', 'sharedStore')
@observer
class PostListForm extends React.Component<PostListProps, {}> {
    constructor(props: any) {
        super(props);
    }
    componentDidMount() {
        this.props.postStore.getPostList();
        this.props.sharedStore.getCategoryList();
        this.props.sharedStore.getTagList();
        this.props.sharedStore.getUserList().subscribe(res => {
            if (res.errno === 0) this.props.sharedStore.setUserList(res.data);
        });
    }
    pageChanged(page: number) {
        this.props.postStore.setPlReqParams({
            page
        });
    }
    tabChanged(key: string) {
        this.props.postStore.setSelectedRowKeys([]);
        this.props.postStore.setPlReqParams({
            status: key
        });
    }

    bulkDelete = () => {
        const {postStore} = this.props;
        const ids = postStore.selectedRowKeys.map(Number);
        if (!ids.length) return message.warning('请先选择文章');
        const force = String(postStore.plReqParams.status) === '4';
        Modal.confirm({
            title: '提示',
            content: `确定${force ? '永久删除' : '将'}选中的 ${ids.length} 篇文章${force ? '' : '移入回收站'}吗？`,
            onOk: () => new Promise<void>((resolve, reject) => {
                postStore.bulkPost(force ? 'forceDelete' : 'delete', ids).subscribe(res => {
                    if (res.errno !== 0) {
                        message.error(res.errmsg || '批量删除失败');
                        postStore.setLoading(false);
                        reject(new Error(res.errmsg || '批量删除失败'));
                        return;
                    }
                    message.success(`已处理 ${ids.length} 篇文章`);
                    postStore.setSelectedRowKeys([]);
                    postStore.getPostList();
                    resolve();
                }, error => {
                    message.error(error instanceof Error ? error.message : String(error));
                    postStore.setLoading(false);
                    reject(error);
                });
            })
        });
    }

    getOperations() {
        const Search = Input.Search;
        const { sharedStore, postStore } = this.props;
        return (
            <>
                <Form.Item className="forms">
                    <Space size="small" className="bulk-operation-buttons">
                        <Button
                            disabled={!postStore.selectedRowKeys.length || String(postStore.plReqParams.status) === '4'}
                            onClick={() => postStore.setBulkEditOpen(true)}
                        >批量编辑</Button>
                        <Button
                            danger
                            disabled={!postStore.selectedRowKeys.length}
                            onClick={this.bulkDelete}
                        >批量删除</Button>
                    </Space>
                    <Select
                        defaultValue=""
                        style={{width: 120}}
                        placeholder="请选择分类"
                        onChange={(selectedValue: string) => postStore.setPlReqParams({cate: selectedValue, page: 1})}
                    >
                        <Option value="">全部分类</Option>
                        {sharedStore.categoryList.map((cat, key) => <Option key={key.toString()} value={cat.id}>{cat.name}</Option>)}
                    </Select>
                    <Search
                        placeholder="请输入关键字"
                        onSearch={keyword => this.props.postStore.setPlReqParams({keyword, page: 1})}
                        enterButton={true}
                        style={{ width: 200, marginLeft: 10 }}
                    />
                </Form.Item>
            </>
        );
    }
    render() {
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="page-list post-list">
                    <Tabs className="tabs"
                        defaultActiveKey=""
                        type="card"
                        destroyOnHidden={true}
                        onChange={key => {this.tabChanged(key); }}
                        tabBarExtraContent={this.getOperations()}
                    >
                        <TabPane tab="全部" key="">
                            <PostListTable {...this.props} />
                        </TabPane>
                        <TabPane tab="草稿" key="0">
                            <PostListTable {...this.props} />
                        </TabPane>
                        <TabPane tab="已发布" key="3">
                            <PostListTable {...this.props} />
                        </TabPane>
                        <TabPane tab="审核中" key="1">
                            <PostListTable {...this.props} />
                        </TabPane>
                        <TabPane tab="已拒绝" key="2">
                            <PostListTable {...this.props} />
                        </TabPane>
                        <TabPane tab="回收站" key="4">
                            <PostListTable {...this.props} />
                        </TabPane>
                    </Tabs>
                </div>
            </>
        );
    }
}
export default PostListForm;
