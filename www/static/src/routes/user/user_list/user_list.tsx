import * as React from 'react';
import { Link } from '../../../utils/router';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Tabs, Button, Space } from 'antd';
import { observer, inject } from '@admin/utils/mobx-react';
import { UserProps } from '../user.model';
import { message, Modal } from 'antd';
import BreadCrumb from '../../../components/breadcrumb';
function DefaultComponent(props: UserProps) {
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

        legacy.userStore = props.userStore;
        legacy.userStore.setKey('0');
    }
    legacy.onMount = function onMount() {
        legacy.userStore.getUserList();
    };
    legacy.pass = function pass(user: any) {
        legacy.userStore.passUser(user.id);
    };
    legacy.handleDelete = function handleDelete(user: any) {
        if (user.post_num > 0) {
            return Modal.error({
                title: '无法删除',
                content: (
                    <div>
                        <p>当前用户的文章数不为0，请先删除该用户下的所有文章!</p>
                    </div>
                ),
            });
        }
        const that = legacy;
        return Modal.confirm({
            title: '确定删除该用户吗？',
            content: '删除后无法恢复',
            onOk() {
                // message.success('删除成功');
                that.userStore.deleteUser(user.id);
            },
        });
    };
    legacy.handleSelect = function handleSelect(type: any) {
        legacy.userStore.setKey(type);
        return legacy.userStore.getUserList(type === '3' ? 'contributor' : '');
    };
    legacy.deny = function deny(user: any) {
        const that = legacy;
        return Modal.confirm({
            title: '拒绝该用户的申请后会直接删除该账号',
            content: '删除后无法恢复',
            onOk() {
                that.userStore.deleteUser(
                    user.id,
                    () => {
                        message.success('删除成功');
                        that.userStore.getUserList(
                            that.userStore.key === 3 ? 'contributor' : '',
                        );
                    },
                    () => {
                        message.success('删除失败，请稍后重试');
                    },
                );
            },
        });
    };
    legacy.getUserType = function getUserType(user: any) {
        switch (user.type) {
            case 1:
                return '管理员';
            case 2:
                return '编辑';
            case 3:
                return '投稿者';
            case 4:
                return '评论者';
            default:
                return '';
        }
    };
    legacy.getUserList = function getUserList() {
        if (legacy.userStore.loading) {
            return (
                <tr>
                    <td className="center" colSpan="11">
                        加载中……
                    </td>
                </tr>
            );
        }
        if (!legacy.userStore.userList.length) {
            return (
                <tr>
                    <td className="center" colSpan="11">
                        无相关用户
                    </td>
                </tr>
            );
        }
        return legacy.userStore.userList.map((item) => {
            return (
                <tr key={item.id}>
                    <td scope="row">{item.id}</td>
                    <td>{item.display_name || item.name}</td>
                    <td>{item.email}</td>
                    <td>
                        {(item.social_accounts || []).length ? (
                            item.social_accounts.map((account) => (
                                <span
                                    key={account.provider}
                                    className="label label-info"
                                    style={{ marginRight: 4 }}
                                >
                                    {account.provider}
                                </span>
                            ))
                        ) : (
                            <span className="gray">未绑定</span>
                        )}
                    </td>
                    <td>{legacy.getUserType(item)}</td>
                    <td>
                        {item.status === 1 ? (
                            <span className="label label-success">有效</span>
                        ) : (
                            <span className="label label-warning">禁用</span>
                        )}
                    </td>
                    <td>{item.post_num}</td>
                    <td>{item.comment_num}</td>
                    <td>{item.create_time}</td>
                    <td>{item.last_login_time}</td>
                    <td>
                        <Space size="small">
                            {legacy.userStore.key === '0' ? (
                                <Link to={`/user/edit/${item.id}`}>
                                    <Button
                                        type="primary"
                                        icon={<EditOutlined />}
                                        size="small"
                                    >
                                        编辑
                                    </Button>
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-success btn-xs"
                                    onClick={legacy.pass.bind(null, item)}
                                >
                                    <span className="glyphicon glyphicon-ok" />
                                    通过
                                </button>
                            )}
                            {legacy.userStore.key === '0' ? (
                                <Button
                                    onClick={legacy.handleDelete.bind(null, item)}
                                    type="primary"
                                    danger
                                    icon={<DeleteOutlined />}
                                    size="small"
                                >
                                    删除
                                </Button>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-warning btn-xs"
                                    onClick={legacy.deny.bind(null, item)}
                                >
                                    <span className="glyphicon glyphicon-remove" />
                                    拒绝
                                </button>
                            )}
                        </Space>
                    </td>
                </tr>
            );
        });
    };
    legacy.render = function render() {
        const TabPane = Tabs.TabPane;
        return (
            <div className="fk-content-wrap">
                <BreadCrumb {...props} />
                <div className="manage-container">
                    <Tabs
                        defaultActiveKey={props.userStore.key.toString()}
                        onChange={(type) => legacy.handleSelect(type)}
                    >
                        <TabPane key="0" tab="全　部" />
                        <TabPane key="3" tab="审核中" />
                    </Tabs>
                    <table className="table table-striped">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>用户名</th>
                                <th>邮箱</th>
                                <th>社交账号</th>
                                <th>用户组</th>
                                <th>有效</th>
                                <th>文章数</th>
                                <th>评论数</th>
                                <th>注册时间</th>
                                <th>最后登录时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>{legacy.getUserList()}</tbody>
                    </table>
                </div>
            </div>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
    }, []);
    return legacy.render();
}
export default inject('userStore')(observer(DefaultComponent));
