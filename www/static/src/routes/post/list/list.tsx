import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
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
    useTranslation('admin');
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
            if (!ids.length) return message.warning(i18n.t("请先选择文章"));
            const force = String(postStore.plReqParams.status) === '4';
            Modal.confirm({
                title: i18n.t("提示"),
                content: force
                    ? i18n.t('确定永久删除选中的 {{count}} 篇文章吗？', {count: ids.length})
                    : i18n.t('确定将选中的 {{count}} 篇文章移入回收站吗？', {count: ids.length}),
                onOk: () =>
                    new Promise<void>((resolve, reject) => {
                        postStore
                            .bulkPost(force ? 'forceDelete' : 'delete', ids)
                            .subscribe(
                                (res) => {
                                    if (res.errno !== 0) {
                                        message.error(i18n.t(res.errmsg || '') || i18n.t("批量删除失败"));
                                        postStore.setLoading(false);
                                        reject(new Error(i18n.t(res.errmsg || '') || i18n.t("批量删除失败")));
                                        return;
                                    }
                                    message.success(i18n.t("已处理 {{value0}} 篇文章", {value0: ids.length}));
                                    postStore.setSelectedRowKeys([]);
                                    postStore.getPostList();
                                    resolve();
                                },
                                (error) => {
                                    message.error(
                                        error instanceof Error
                                            ? i18n.t(error.message || '')
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
                                {i18n.t("批量编辑")}
                            </Button>
                            <Button danger onClick={legacy.bulkDelete}>
                                {i18n.t("批量删除")}
                            </Button>
                        </Space>
                    )}
                    <Select
                        defaultValue=""
                        style={{ width: 120 }}
                        placeholder={i18n.t("请选择分类")}
                        onChange={(selectedValue: string) =>
                            postStore.setPlReqParams({ cate: selectedValue, page: 1 })
                        }
                    >
                        <Option value="">{i18n.t("全部分类")}</Option>
                        {sharedStore.categoryList.map((cat, key) => (
                            <Option key={key.toString()} value={cat.id}>
                                {cat.name}
                            </Option>
                        ))}
                    </Select>
                    <Search
                        placeholder={i18n.t("请输入关键字")}
                        onSearch={(keyword) =>
                            props.postStore.setPlReqParams({ keyword, page: 1 })
                        }
                        enterButton={true}
                        style={{ width: 200, marginLeft: 10 }}
                    />
                    <Button type="primary" style={{ marginLeft: 10 }} onClick={() => props.history.push('/post/create')}>{i18n.t("添加文章")}</Button>
                </Form.Item>
            </>
        );
    };
    legacy.render = function render() {
        return (
            <>
                <BreadCrumb {...props} />
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
                        <TabPane tab={i18n.t("全部")} key="">
                            <PostListTable {...props} />
                        </TabPane>
                        <TabPane tab={i18n.t("草稿")} key="0">
                            <PostListTable {...props} />
                        </TabPane>
                        <TabPane tab={i18n.t("已发布")} key="3">
                            <PostListTable {...props} />
                        </TabPane>
                        <TabPane tab={i18n.t("审核中")} key="1">
                            <PostListTable {...props} />
                        </TabPane>
                        <TabPane tab={i18n.t("已拒绝")} key="2">
                            <PostListTable {...props} />
                        </TabPane>
                        <TabPane tab={i18n.t("回收站")} key="4">
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
