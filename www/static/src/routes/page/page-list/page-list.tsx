import * as React from 'react';
import { Table, Button } from 'antd';
import { observer, inject } from 'mobx-react';
import { Link } from 'react-router-dom';
import { Modal } from 'antd';
import BreadCrumb from '../../../components/breadcrumb';
import { PageListProps } from '../page.model';

const confirm = Modal.confirm;

@inject('pageStore')
@observer 
class PageList extends React.Component<PageListProps, {}> {
    constructor(props: PageListProps) {
        super(props);
    }
    componentDidMount() {
        const pageStore = this.props.pageStore;
        const search = this.props.location.search;
        const page = new URLSearchParams(search).get('page') || '1';
        this.props.pageStore.setPage(page);
        pageStore.getPageList();
    }
    delete(id: string) {
        confirm({
          title: '提示',
          content: '确定删除吗?',
          onOk: () => {
            this.props.pageStore.pageDeleteById(id);
          }
        });
    }

    renderActions(post: any) {
        const status = post.status;
        if (status === '' || status === 3) {
            return (
                <>
                    <Button onClick={() => this.props.history.push(`/page/edit/${post.id}`)} type="primary" icon="edit" size="small">编辑</Button>
                    <Button onClick={() => this.delete(post.id)} style={{marginLeft: 8}} type="danger" icon="delete" size="small">删除</Button>
                </>
            );
        } else {
            return (
                <>
                    {/* <Button disabled={status === '3'} type="primary"  onClick={() => this.pass(post.id)} className="success-button" icon="check" size="small">通过</Button>
                    <Button disabled={status === '2'} onClick={() => this.refuse(post.id)} style={{marginLeft: 8}} type="danger" icon="close" size="small">拒绝</Button> */}
                </>
            );
        }
    }

    render() {
        const Column = Table.Column;
        const pageStore = this.props.pageStore;
        const { pageList, loading, pagination } = this.props.pageStore;
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <Table 
                    dataSource={pageList}
                    loading={loading}
                    pagination={pagination}
                    style={{margin: '10px 20px'}}
                    onChange={e => {
                        // pageStore.setPlReqParams({
                        //     page: e.current
                        // }); 
                    }}
                >
                    <Column
                        title="标题"
                        key="title"
                        render={(post) => (
                            <>
                                <Link to={`/post/edit/${post.id}`}>{post.title}</Link>
                                {/* 当文章为公开且发布状态时渲染文章链接 */}
                                {
                                    post.status === 3 && post.is_public 
                                    ?
                                        <a
                                            href={`/page/${post.pathname}.html`}
                                            target="_blank"
                                            className="admin-post-link"
                                        >
                                            <span className="glyphicon glyphicon-link" />
                                        </a>
                                    :
                                        null
                                }
                            </>
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
                        title="创建日期"
                        dataIndex="create_time"
                        key="create_time"
                    />
                    <Column
                        title="修改日期"
                        dataIndex="update_time"
                        key="update_time"
                    />
                    <Column
                        title="操作"
                        key="action"
                        render={post => this.renderActions(post)}
                    />
                </Table>
            </>
        );
    }
}

export default PageList;
