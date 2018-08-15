import * as React from 'react';
import BreadCrumb from '../../../components/breadcrumb';
import { Tabs } from 'antd';
import './list.less';
import PostListTable from './list-table';
import { PostListProps } from './list.model';
const TabPane = Tabs.TabPane;
class PostList extends React.Component<PostListProps, {}> {
    componentDidMount() {
        // this.props.postStore.getPostList();
    }
    tabChanged(key: string) {
        console.log(key);
    }
    render() {
        return (
            <div>
                <Tabs className="tabs" defaultActiveKey="1" type="card" onChange={() => this.tabChanged}>
                    <TabPane tab="全部" key="1">
                        <PostListTable/>
                    </TabPane>
                    <TabPane tab="已发布" key="2">Content of Tab Pane 2</TabPane>
                    <TabPane tab="审核中" key="3">Content of Tab Pane 3</TabPane>
                    <TabPane tab="已拒绝" key="4">Content of Tab Pane 3</TabPane>
                </Tabs>
            </div>
        );
    }
}

export default PostList;
