import * as React from 'react';
import { Table, Divider, Icon } from 'antd';
import './list.less';
class PostListTable extends React.Component<any, {}> {
    componentDidMount() {
        console.log('app mounted!');
    }
    render() {
        const Column = Table.Column;
        const data = [{
            key: '1',
            firstName: '标题',
            lastName: 'Brown',
            age: 32,
            address: 'New York No. 1 Lake Park',
          }, {
            key: '2',
            firstName: 'Jim',
            lastName: 'Green',
            age: 42,
            address: 'London No. 1 Lake Park',
          }, {
            key: '3',
            firstName: 'Joe',
            lastName: 'Black',
            age: 32,
            address: 'Sidney No. 1 Lake Park',
          }];
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
                    dataIndex="releaseDate"
                    key="releaseDate"
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
