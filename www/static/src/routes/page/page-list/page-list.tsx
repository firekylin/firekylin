import * as React from 'react';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Table, Button, message, Space } from 'antd';
import { observer, inject } from '@admin/utils/mobx-react';
import { Link } from '../../../utils/router';
import { Modal } from 'antd';
import BreadCrumb from '../../../components/breadcrumb';
import { PageListProps } from '../page.model';
import { TABLE_DELAY } from '../../../config';

const confirm = Modal.confirm;
function PageList(props: PageListProps) {
    const [state, setState] = React.useState(() => ({}));
    const legacyRef = React.useRef({});
    const legacy = legacyRef.current as any;
    legacy.state = state;
    legacy.setState = (update: any, callback?: () => void) => {
        setState((previous: any) => {
            const next = {
                ...previous,
                ...(typeof update === 'function' ? update(previous, props) : update),
            };
            legacy.state = next;
            return next;
        });
        if (callback) queueMicrotask(callback);
    };
    if (!legacy.__initialized) {
        legacy.__initialized = true;
    }
    legacy.onMount = function onMount() {
        const { pageStore, sharedStore } = props;
        const search = props.location.search;
        const page = new URLSearchParams(search).get('page') || '1';
        props.pageStore.setPage(page);
        sharedStore.getPageList(pageStore.page);
    };
    legacy.delete = function (id: string) {
        confirm({
            title: '提示',
            content: '确定删除吗?',
            onOk: () => {
                props.pageStore.pageDeleteById(id).subscribe((res) => {
                    if (res.errno === 0) {
                        message.success('删除成功');
                        props.sharedStore.getPageList(props.pageStore.page);
                    }
                });
            },
        });
    };
    legacy.render = function render() {
        const Column = Table.Column;
        const { pageStore, sharedStore } = props;
        const { pagination } = pageStore;
        const { pageList, loading } = sharedStore;
        return (
            <>
                <BreadCrumb className="breadcrumb" {...props} />
                <Table
                    dataSource={pageList}
                    loading={{ spinning: loading.page, delay: TABLE_DELAY }}
                    pagination={pagination}
                    style={{ margin: '10px 20px' }}
                    onChange={(e) => {
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
                                {page.status === 3 && page.is_public ? (
                                    <a
                                        href={`/page/${page.pathname}.html`}
                                        target="_blank"
                                        className="admin-post-link"
                                    >
                                        <span className="glyphicon glyphicon-link" />
                                    </a>
                                ) : null}
                            </>
                        )}
                    />

                    <Column title="作者" dataIndex="author" key="author" />
                    <Column title="状态" dataIndex="statusText" key="statusText" />
                    <Column title="创建日期" dataIndex="create_time" key="create_time" />
                    <Column title="修改日期" dataIndex="update_time" key="update_time" />
                    <Column
                        title="操作"
                        key="action"
                        render={(page) => (
                            <Space size="small">
                                <Button
                                    onClick={() =>
                                        props.history.push(`/page/edit/${page.id}`)
                                    }
                                    type="primary"
                                    icon={<EditOutlined />}
                                    size="small"
                                >
                                    编辑
                                </Button>
                                <Button
                                    onClick={() => legacy.delete(page.id)}
                                    type="primary"
                                    danger
                                    icon={<DeleteOutlined />}
                                    size="small"
                                >
                                    删除
                                </Button>
                            </Space>
                        )}
                    />
                </Table>
            </>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
    }, []);
    return legacy.render();
}

export default inject('pageStore', 'sharedStore')(observer(PageList));
