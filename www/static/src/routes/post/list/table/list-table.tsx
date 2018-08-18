import * as React from 'react';
import { Table, Button } from 'antd';
import './list-table.less';
import { observer, inject } from 'mobx-react';
import { Link } from 'react-router-dom';

@inject('postStore')
@observer 
class PostListTable extends React.Component<any, {}> {
    render() {
        const Column = Table.Column;
        const { postList, loading, pagination } = this.props.postStore;
        return (
            <Table 
                dataSource={postList}
                loading={loading}
                pagination={pagination}
                onChange={e => {this.props.postStore.setPlReqParams({
                    page: e.current
                }); }}
            >
                <Column
                    title="标题"
                    key="title"
                    render={(post) => (
                        <Link to={`/post/edit/${post.id}`}>{post.title}</Link>
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
                    dataIndex="update_time"
                    key="update_time"
                />
                <Column
                    title="操作"
                    key="action"
                    render={(text, record) => (
                        <>
                            <Button type="primary" icon="edit" size="small">编辑</Button>
                            <Button style={{marginLeft: 8}} type="danger" icon="delete" size="small">删除</Button>
                        </>
                    )}
                />
            </Table>
        );
    }
}

export default PostListTable;
