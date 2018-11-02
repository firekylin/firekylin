import * as React from 'react';
import { Table, Button, message } from 'antd';
import { observer, inject } from 'mobx-react';
import { Link } from 'react-router-dom';
import { Modal } from 'antd';
import BreadCrumb from '../../../components/breadcrumb';
import { PageListProps } from '../page.model';

const confirm = Modal.confirm;

@inject('pageStore', 'sharedStore')
@observer 
class PageList extends React.Component<PageListProps, {}> {
    constructor(props: PageListProps) {
        super(props);
    }
    componentDidMount() {
        const { pageStore, sharedStore } = this.props;
        const search = this.props.location.search;
        const page = new URLSearchParams(search).get('page') || '1';
        this.props.pageStore.setPage(page);
        sharedStore.getPageList(pageStore.page);
    }
    delete(id: string) {
        confirm({
          title: '提示',
          content: '确定删除吗?',
          onOk: () => {
            this.props.pageStore.pageDeleteById(id)
            .subscribe(
                res => {
                  if (res.errno === 0) {
                    message.success('删除成功');
                    this.props.sharedStore.getPageList(this.props.pageStore.page);
                  }
                }
            );
          }
        });
    }

    render() {
        const Column = Table.Column;
        const { pageStore, sharedStore } = this.props;
        const { pagination } = pageStore;
        const { pageList, loading } = sharedStore;
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <Table 
                    dataSource={pageList}
                    loading={loading.page}
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
                        render={(page) => (
                            <>
                                <Link to={`/page/edit/${page.id}`}>{page.title}</Link>
                                {/* 当文章为公开且发布状态时渲染文章链接 */}
                                {
                                    page.status === 3 && page.is_public 
                                    ?
                                        <a
                                            href={`/page/${page.pathname}.html`}
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
                        render={page => (
                            <>
                                <Button onClick={() => this.props.history.push(`/page/edit/${page.id}`)} type="primary" icon="edit" size="small">编辑</Button>
                                <Button onClick={() => this.delete(page.id)} style={{marginLeft: 8}} type="danger" icon="delete" size="small">删除</Button>
                            </>
                        )}
                    />
                </Table>
            </>
        );
    }
}

export default PageList;
