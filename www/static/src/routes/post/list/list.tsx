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
        this.props.postStore.getPostList();
    }
    pageChanged(page: number) {
        this.props.postStore.setPlReqParams({
            page
        });
    }
    tabChanged(key: string) {
        this.props.postStore.setPlReqParams({
            status: key
        });
    }
    render() {
        return (
            <div>
                <Tabs className="tabs" defaultActiveKey="" type="card" onChange={key => {this.tabChanged(key); }}>
                    <TabPane tab="全部" key="">
                        <PostListTable />
                    </TabPane>
                    <TabPane tab="已发布" key="3">
                        <PostListTable />
                    </TabPane>
                    <TabPane tab="审核中" key="1">
                        <PostListTable />
                    </TabPane>
                    <TabPane tab="已拒绝" key="2">
                        <PostListTable />
                    </TabPane>
                </Tabs>
            </div>
        );
    }
}

export default PostList;
