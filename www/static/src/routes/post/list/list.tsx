import * as React from 'react';
import { Tabs } from 'antd';
import './list.less';
import { observer, inject } from 'mobx-react';
import PostListTable from './table/list-table';
import { PostProps } from '../post.model';
const TabPane = Tabs.TabPane;
@inject('postStore')
@observer class PostList extends React.Component<PostProps, {}> {
    componentDidMount() {
        this.getPostList({});
    }
    getPostList(params: any) {
        this.props.postStore.getPostList({
            page: 1,
            status: params.status
        });
    }
    tabChanged(key: string) {
        this.getPostList({
            // status: key
        });
    }
    render() {
        return (
            <div>
                <Tabs className="tabs" defaultActiveKey="1" type="card" onChange={key => {this.tabChanged(key); }}>
                    <TabPane tab="全部" key="1">
                        <PostListTable />
                    </TabPane>
                    <TabPane tab="已发布" key="3">Content of Tab Pane 2</TabPane>
                    <TabPane tab="审核中" key="2">Content of Tab Pane 3</TabPane>
                    <TabPane tab="已拒绝" key="4">Content of Tab Pane 3</TabPane>
                </Tabs>
            </div>
        );
    }
}

export default PostList;
