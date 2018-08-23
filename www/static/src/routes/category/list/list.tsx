import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { Button, Table, Modal } from 'antd';
import BreadCrumb from '../../../components/breadcrumb';
import { CategoryListProps } from './list.model';
import classnames from 'classnames';
import './list.less';
import { Category } from '../../../models/category.model';
const confirm = Modal.confirm;

@inject('categoryStore', 'sharedStore')
@observer class CategoryList extends React.Component<CategoryListProps, {}> {
    constructor(props: any) {
        super(props);
    }
    componentDidMount() {
        this.props.sharedStore.getCategoryList();
        this.props.sharedStore.getDefaultCategory();
    }

    delete(id: number) {
        confirm({
            title: '提示',
            content: '确定删除吗?',
            onOk: () => {
                this.props.categoryStore.deleteCategoryId(id);
            }
        });
    }

    setDefault(id: number) {
        this.props.categoryStore.setDefaultCategory(id);
    }
    render() {
        const Column = Table.Column;
        const { categoryList, defaultCategory, loading } = this.props.sharedStore;
        return (
            <div className="category-list">
                <BreadCrumb {...this.props} />
                <Table 
                    dataSource={categoryList}
                    loading={loading.category}
                    className="page-list"
                    rowKey={category => category.id.toString()}
                >
                    <Column
                        title="名称"
                        key="name"
                        dataIndex="name"
                    />
                    <Column
                        title="缩略名"
                        dataIndex="pathname"
                        key="pathname"
                    />
                    <Column
                        title="文章数"
                        dataIndex="post_cate"
                        key="post_cate"
                    />
                    <Column
                        title="操作"
                        key="action"
                        render={(post: Category) => (
                            <>
                                <Button 
                                    disabled={defaultCategory === post.id.toString()}
                                    onClick={() => this.setDefault(post.id)} 
                                    className={classnames({'defaultCatButton': !(defaultCategory === post.id.toString())})}
                                    type="primary" 
                                    icon="star" 
                                    size="small"
                                >
                                    默认
                                </Button>
                                <Button 
                                    onClick={() => this.props.history.push(`/cate/edit/${post.id}`)}
                                    type="primary" 
                                    icon="edit" 
                                    size="small" 
                                    style={{marginLeft: 8}}
                                >
                                    编辑
                                </Button>
                                <Button onClick={() => this.delete(post.id)} style={{marginLeft: 8}} type="danger" icon="delete" size="small">删除</Button>
                            </>
                        )}
                    />
                </Table>
            </div>
        );
    }
}
export default CategoryList;
