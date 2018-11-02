import * as React from 'react';
import './list.less';
import { observer, inject } from 'mobx-react';
import PostListTable from './table/list-table';
import { Tabs, Input, Form, Select } from 'antd';
import { PostListProps } from './list.model';
import BreadCrumb from '../../../components/breadcrumb';
const TabPane = Tabs.TabPane;
const FormItem = Form.Item;
const Option = Select.Option;
@inject('postStore', 'sharedStore')
@observer 
class PostListForm extends React.Component<PostListProps, {}> {
    constructor(props: any) {
        super(props);
    }
    componentDidMount() {
        this.props.postStore.getPostList();
        this.props.sharedStore.getCategoryList();
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
        const { sharedStore, postStore } = this.props;
        return (
            <>
                <FormItem className="forms">
                    <Select 
                        defaultValue="" 
                        style={{float: 'left', width: 120}} 
                        placeholder="请选择分类"
                        onChange={(selectedValue: string) => postStore.setPlReqParams({cate: selectedValue, page: 1})}
                    >
                        <Option value="">全部分类</Option>
                        {sharedStore.categoryList.map((cat, key) => <Option key={key.toString()} value={cat.id}>{cat.name}</Option>)}
                    </Select>
                    <Search
                        placeholder="请输入关键字"
                        onSearch={keyword => this.props.postStore.setPlReqParams({keyword, page: 1})}
                        enterButton={true}
                        style={{ width: 200, marginLeft: 10 }}
                    />
                </FormItem>
            </>
        );
    }
    render() {
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="page-list post-list">
                    <Tabs className="tabs" 
                        defaultActiveKey="" 
                        type="card" 
                        onChange={key => {this.tabChanged(key); }}
                        tabBarExtraContent={this.getOperations()}
                    >
                        <TabPane tab="全部" key="">
                            <PostListTable {...this.props} />
                        </TabPane>
                        <TabPane tab="已发布" key="3">
                            <PostListTable {...this.props} />
                        </TabPane>
                        <TabPane tab="审核中" key="1">
                            <PostListTable {...this.props} />
                        </TabPane>
                        <TabPane tab="已拒绝" key="2">
                            <PostListTable {...this.props} />
                        </TabPane>
                    </Tabs>
                </div>
            </>
        );
    }
}
const PostList = Form.create()(PostListForm);
export default PostList;
