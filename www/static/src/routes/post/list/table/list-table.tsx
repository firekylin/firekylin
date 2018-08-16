import * as React from 'react';
import { Table, Divider, Icon } from 'antd';
import './list-table.less';
import { observer, inject } from 'mobx-react';

@inject('postStore')
@observer 
class PostListTable extends React.Component<any, {}> {
    componentDidMount() {
        console.log('app mounted!');
    }
    render() {
        const Column = Table.Column;
        const data = this.props.postStore.postList;
        return (
            <Table dataSource={data}>
                <Column
                    title="标题"
                    dataIndex="title"
                    key="title"
                />
                <Column
                    title="作者"
                    dataIndex="author"
                    key="author"
                />
                <Column
                    title="状态"
                    dataIndex="status"
                    key="status"
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
                        <span>
                        <a href="javascript:;">Action</a>
                        <Divider type="vertical" />
                        <a href="javascript:;">Delete</a>
                        <Divider type="vertical" />
                        <a href="javascript:;" className="ant-dropdown-link">
                            More actions <Icon type="down" />
                        </a>
                        </span>
                    )}
                />
            </Table>
        );
    }
}

export default PostListTable;
