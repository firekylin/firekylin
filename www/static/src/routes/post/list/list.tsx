import * as React from 'react';
import './list.less';
import { observer, inject } from '@admin/utils/mobx-react';
import PostListTable from './table/list-table';
import { Button, Form, Input, Modal, Select, Space, Tabs, message } from 'antd';
import { PostListProps } from './list.model';
import BreadCrumb from '../../../components/breadcrumb';
const TabPane = Tabs.TabPane;
const Option = Select.Option;
function PostListForm(props: PostListProps) {
    const [state, setState] = React.useState(() => ({}));
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
        legacy.bulkDelete = () => {
            const { postStore } = props;
            const ids = postStore.selectedRowKeys.map(Number);
            if (!ids.length) return message.warning('请先选择文章');
            const force = String(postStore.plReqParams.status) === '4';
            Modal.confirm({
                title: '提示',
                content: `确定${force ? '永久删除' : '将'}选中的 ${ids.length} 篇文章${force ? '' : '移入回收站'}吗？`,
                onOk: () =>
                    new Promise<void>((resolve, reject) => {
                        postStore
                            .bulkPost(force ? 'forceDelete' : 'delete', ids)
                            .subscribe(
                                (res) => {
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
                                },
                                (error) => {
                                    message.error(
                                        error instanceof Error
                                            ? error.message
                                            : String(error),
                                    );
                                    postStore.setLoading(false);
                                    reject(error);
                                },
                            );
                    }),
            });
        };
    }
    legacy.onMount = function onMount() {
        props.postStore.getPostList();
        props.sharedStore.getCategoryList();
        props.sharedStore.getTagList();
        props.sharedStore.getUserList().subscribe((res) => {
            if (res.errno === 0) props.sharedStore.setUserList(res.data);
        });
    };
    legacy.pageChanged = function pageChanged(page: number) {
        props.postStore.setPlReqParams({ page });
    };
    legacy.tabChanged = function tabChanged(key: string) {
        props.postStore.setSelectedRowKeys([]);
        props.postStore.setPlReqParams({ status: key });
    };
    legacy.getOperations = function getOperations() {
        const Search = Input.Search;
        const { sharedStore, postStore } = props;
        return (
            <>
                <Form.Item className="forms">
                    {postStore.selectedRowKeys.length > 0 && (
                        <Space size="small" className="bulk-operation-buttons">
                            <Button
                                disabled={String(postStore.plReqParams.status) === '4'}
                                onClick={() => postStore.setBulkEditOpen(true)}
                            >
                                批量编辑
                            </Button>
                            <Button danger onClick={legacy.bulkDelete}>
                                批量删除
                            </Button>
                        </Space>
                    )}
                    <Select
                        defaultValue=""
                        style={{ width: 120 }}
                        placeholder="请选择分类"
                        onChange={(selectedValue: string) =>
                            postStore.setPlReqParams({ cate: selectedValue, page: 1 })
                        }
                    >
                        <Option value="">全部分类</Option>
                        {sharedStore.categoryList.map((cat, key) => (
                            <Option key={key.toString()} value={cat.id}>
                                {cat.name}
                            </Option>
                        ))}
                    </Select>
                    <Search
                        placeholder="请输入关键字"
                        onSearch={(keyword) =>
                            props.postStore.setPlReqParams({ keyword, page: 1 })
                        }
                        enterButton={true}
                        style={{ width: 200, marginLeft: 10 }}
                    />
                </Form.Item>
            </>
        );
    };
    legacy.render = function render() {
        return (
            <>
                <BreadCrumb {...props} actions={<Button type="primary" onClick={() => props.history.push('/post/create')}>添加文章</Button>} />
                <div className="page-list post-list">
                    <Tabs
                        className="tabs"
                        defaultActiveKey=""
                        type="card"
                        destroyOnHidden={true}
                        onChange={(key) => {
                            legacy.tabChanged(key);
                        }}
                        tabBarExtraContent={legacy.getOperations()}
                    >
                        <TabPane tab="全部" key="">
                            <PostListTable {...props} />
                        </TabPane>
                        <TabPane tab="草稿" key="0">
                            <PostListTable {...props} />
                        </TabPane>
                        <TabPane tab="已发布" key="3">
                            <PostListTable {...props} />
                        </TabPane>
                        <TabPane tab="审核中" key="1">
                            <PostListTable {...props} />
                        </TabPane>
                        <TabPane tab="已拒绝" key="2">
                            <PostListTable {...props} />
                        </TabPane>
                        <TabPane tab="回收站" key="4">
                            <PostListTable {...props} />
                        </TabPane>
                    </Tabs>
                </div>
            </>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
    }, []);
    return legacy.render();
}

export default inject('postStore', 'sharedStore')(observer(PostListForm));
