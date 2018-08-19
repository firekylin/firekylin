import * as React from 'react';
import './list.less';
import { observer, inject } from 'mobx-react';
import PostListTable from './table/list-table';
import { Tabs, Input, Form, Icon, Button, Select } from 'antd';
import { PostListProps } from './list.model';
const TabPane = Tabs.TabPane;
const FormItem = Form.Item;
const Option = Select.Option;
@inject('postStore')
@observer class PostListForm extends React.Component<PostListProps, {}> {
    constructor(props: any) {
        super(props);
    }
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
    handleSubmit() {
        // 
    }

    getOperations() {
        const Search = Input.Search;
        return (
            <>
                <FormItem className="forms">
                    <Select defaultValue="" style={{float: 'left'}} placeholder="请选择分类">
                        <Option value="">全部分类</Option>
                    </Select>
                    <Search
                        placeholder="请输入关键字"
                        onSearch={keyword => this.props.postStore.setPlReqParams({keyword})}
                        enterButton={true}
                        style={{ width: 200, marginLeft: 10 }}
                    />
                </FormItem>
            </>
        );
    }
    render() {
        return (
            <div className="post-list">
                <Tabs className="tabs" 
                    defaultActiveKey="" 
                    type="card" 
                    onChange={key => {this.tabChanged(key); }}
                    tabBarExtraContent={this.getOperations()}
                >
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
const PostList = Form.create()(PostListForm);
export default PostList;
