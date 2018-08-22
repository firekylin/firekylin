import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { Button, Table, Modal } from 'antd';
import BreadCrumb from '../../../components/breadcrumb';
import { CategoryListProps } from './list.model';
const confirm = Modal.confirm;

@inject('categoryStore', 'sharedStore')
@observer class CategoryList extends React.Component<CategoryListProps, {}> {
    constructor(props: any) {
        super(props);
    }
    componentDidMount() {
        this.props.sharedStore.getCategoryList();
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
    render() {
        const Column = Table.Column;
        const { categoryList, loading } = this.props.sharedStore;
        return (
            <>
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
                        render={post => (
                            <>
                                <Button type="primary" icon="star" size="small" style={{backgroundColor: '#5cb85c', borderColor: '#449d44'}}>默认</Button>
                                <Button type="primary" icon="edit" size="small" style={{marginLeft: 8}}>编辑</Button>
                                <Button onClick={() => this.delete(post.id)} style={{marginLeft: 8}} type="danger" icon="delete" size="small">删除</Button>
                            </>
                        )}
                    />
                </Table>
            </>
        );
    }
}
export default CategoryList;
