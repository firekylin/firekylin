import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
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
    }
    legacy.onMount = function onMount() {
        props.sharedStore.getCategoryList();
        props.sharedStore.getDefaultCategory();
    };
    legacy.delete = function (id: number) {
        confirm({
            title: i18n.t("提示"),
            content: i18n.t("确定删除吗?"),
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
                <div className="page-list">
                    <div className="list-toolbar"><Button type="primary" onClick={() => props.history.push('/cate/create')}>{i18n.t("添加分类")}</Button></div>
                    <Table
                        dataSource={categoryList}
                        loading={{ spinning: loading.category, delay: TABLE_DELAY }}
                        rowKey={(category) => category.id.toString()}
                    >
                        <Column title={i18n.t("名称")} key="name" dataIndex="name" />

                        <Column title={i18n.t("缩略名")} dataIndex="pathname" key="pathname" />

                        <Column title={i18n.t("文章数")} dataIndex="post_cate" key="post_cate" />

                        <Column
                            title={i18n.t("操作")}
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
                                        {i18n.t("默认")}
                                    </Button>
                                    <Button
                                        onClick={() =>
                                            props.history.push(`/cate/edit/${post.id}`)
                                        }
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
                            )}
                        />
                    </Table>
                </div>
            </div>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
    }, []);
    return legacy.render();
}

export default inject('categoryStore', 'sharedStore')(observer(CategoryList));
