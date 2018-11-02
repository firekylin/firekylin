import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { Button, Table, Modal } from 'antd';
import BreadCrumb from '../../../components/breadcrumb';
import './list.less';
import { Tag } from '../../../models/tag.model';
import { TagProps } from '../tag.model';
const confirm = Modal.confirm;

@inject('tagStore', 'sharedStore')
@observer class TagList extends React.Component<TagProps, {}> {
    constructor(props: any) {
        super(props);
    }
    componentDidMount() {
        this.props.sharedStore.getTagList();
    }

    delete(id: number) {
        confirm({
            title: '提示',
            content: '确定删除吗?',
            onOk: () => {
                this.props.tagStore.tagDelete(id);
            }
        });
    }

    render() {
        const Column = Table.Column;
        const { tagList, loading } = this.props.sharedStore;
        return (
            <div className="category-list">
                <BreadCrumb {...this.props} />
                <Table 
                    dataSource={tagList}
                    loading={loading.tag}
                    className="page-list"
                    rowKey={tag => tag.id.toString()}
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
                        dataIndex="post_tag"
                        key="post_tag"
                    />
                    <Column
                        title="操作"
                        key="action"
                        render={(tag: Tag) => (
                            <>
                                <Button 
                                    onClick={() => this.props.history.push(`/tag/edit/${tag.id}`)}
                                    type="primary" 
                                    icon="edit" 
                                    size="small" 
                                    style={{marginLeft: 8}}
                                >
                                    编辑
                                </Button>
                                <Button onClick={() => this.delete(tag.id)} style={{marginLeft: 8}} type="danger" icon="delete" size="small">删除</Button>
                            </>
                        )}
                    />
                </Table>
            </div>
        );
    }
}
export default TagList;
