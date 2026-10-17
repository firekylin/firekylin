import * as React from 'react';
import { observer, inject } from '@admin/utils/mobx-react';
import { DeleteOutlined, EditOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Table, Modal, Space } from 'antd';
import BreadCrumb from '../../../components/breadcrumb';
import { CategoryListProps } from './list.model';
import classnames from 'classnames';
import './list.less';
import { Category } from '../../../models/category.model';
import { TABLE_DELAY } from '../../../config';
const confirm = Modal.confirm;
function CategoryList(props: CategoryListProps) {
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
    }
    legacy.onMount = function onMount() {
        props.sharedStore.getCategoryList();
        props.sharedStore.getDefaultCategory();
    };
    legacy.delete = function (id: number) {
        confirm({
            title: '提示',
            content: '确定删除吗?',
            onOk: () => {
                props.categoryStore.deleteCategoryId(id);
            },
        });
    };
    legacy.setDefault = function setDefault(id: number) {
        props.categoryStore.setDefaultCategory(id);
    };
    legacy.render = function render() {
        const Column = Table.Column;
        const { categoryList, defaultCategory, loading } = props.sharedStore;
        return (
            <div className="category-list">
                <BreadCrumb {...props} />
                <Table
                    dataSource={categoryList}
                    loading={{ spinning: loading.category, delay: TABLE_DELAY }}
                    className="page-list"
                    rowKey={(category) => category.id.toString()}
                >
                    <Column title="名称" key="name" dataIndex="name" />

                    <Column title="缩略名" dataIndex="pathname" key="pathname" />

                    <Column title="文章数" dataIndex="post_cate" key="post_cate" />

                    <Column
                        title="操作"
                        key="action"
                        render={(post: Category) => (
                            <Space size="small">
                                <Button
                                    disabled={defaultCategory === post.id.toString()}
                                    onClick={() => legacy.setDefault(post.id)}
                                    className={classnames({
                                        'fk-btn-success': !(
                                            defaultCategory === post.id.toString()
                                        ),
                                    })}
                                    type="primary"
                                    icon={<StarOutlined />}
                                    size="small"
                                >
                                    默认
                                </Button>
                                <Button
                                    onClick={() =>
                                        props.history.push(`/cate/edit/${post.id}`)
                                    }
                                    type="primary"
                                    icon={<EditOutlined />}
                                    size="small"
                                >
                                    编辑
                                </Button>
                                <Button
                                    onClick={() => legacy.delete(post.id)}
                                    type="primary"
                                    danger
                                    icon={<DeleteOutlined />}
                                    size="small"
                                >
                                    删除
                                </Button>
                            </Space>
                        )}
                    />
                </Table>
            </div>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
    }, []);
    return legacy.render();
}

export default inject('categoryStore', 'sharedStore')(observer(CategoryList));
