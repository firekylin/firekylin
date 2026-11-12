import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import * as React from 'react';
import { Link } from '../../../utils/router';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Tabs, Button, Space, Input, Pagination } from 'antd';
import { observer, inject } from '@admin/utils/mobx-react';
import { UserProps } from '../user.model';
import { message, Modal } from 'antd';
import BreadCrumb from '../../../components/breadcrumb';
function DefaultComponent(props: UserProps) {
    useTranslation('admin');
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
                title: i18n.t("无法删除"),
                content: (
                    <div>
                        <p>{i18n.t("当前用户的文章数不为0，请先删除该用户下的所有文章!")}</p>
                    </div>
                ),
            });
        }
        const that = legacy;
        return Modal.confirm({
            title: i18n.t("确定删除该用户吗？"),
            content: i18n.t("删除后无法恢复"),
            onOk() {
                // message.success('删除成功');
                that.userStore.deleteUser(user.id);
            },
        });
    };
    legacy.handleSelect = function handleSelect(type: any) {
        legacy.userStore.setKey(type);
        return legacy.userStore.getUserList(type === '3' ? 'contributor' : '', 1);
    };
    legacy.deny = function deny(user: any) {
        const that = legacy;
        return Modal.confirm({
            title: i18n.t("拒绝该用户的申请后会直接删除该账号"),
            content: i18n.t("删除后无法恢复"),
            onOk() {
                that.userStore.deleteUser(
                    user.id,
                    () => {
                        message.success(i18n.t("删除成功"));
                        that.userStore.getUserList(
                            that.userStore.key === 3 ? 'contributor' : '',
                        );
                    },
                    () => {
                        message.success(i18n.t("删除失败，请稍后重试"));
                    },
                );
            },
        });
    };
    legacy.getUserType = function getUserType(user: any) {
        switch (user.type) {
            case 1:
                return i18n.t("管理员");
            case 2:
                return i18n.t("编辑");
            case 3:
                return i18n.t("投稿者");
            case 4:
                return i18n.t("评论者");
            default:
                return '';
        }
    };
    legacy.getUserList = function getUserList() {
        if (legacy.userStore.loading) {
            return (
                <tr>
                    <td className="center" colSpan="11">
                        {i18n.t("加载中……")}
                    </td>
                </tr>
            );
        }
        if (!legacy.userStore.userList.length) {
            return (
                <tr>
                    <td className="center" colSpan="11">
                        {i18n.t("无相关用户")}
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
                            <span className="gray">{i18n.t("未绑定")}</span>
                        )}
                    </td>
                    <td>{legacy.getUserType(item)}</td>
                    <td>
                        {item.status === 1 ? (
                            <span className="label label-success">{i18n.t("有效")}</span>
                        ) : (
                            <span className="label label-warning">{i18n.t("禁用")}</span>
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
                                        {i18n.t("编辑")}
                                    </Button>
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-success btn-xs"
                                    onClick={legacy.pass.bind(null, item)}
                                >
                                    <span className="glyphicon glyphicon-ok" />
                                    {i18n.t("通过")}
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
                                    {i18n.t("删除")}
                                </Button>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-warning btn-xs"
                                    onClick={legacy.deny.bind(null, item)}
                                >
                                    <span className="glyphicon glyphicon-remove" />
                                    {i18n.t("拒绝")}
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
                        tabBarExtraContent={
                            <Input.Search
                                placeholder={i18n.t("搜索用户名、别名或邮箱")}
                                aria-label={i18n.t("搜索用户")}
                                defaultValue={legacy.userStore.keyword}
                                allowClear
                                enterButton
                                onSearch={(keyword) => legacy.userStore.getUserList(undefined, 1, keyword)}
                                style={{ width: 280, marginLeft: 10 }}
                            />
                        }
                    >
                        <TabPane key="0" tab={i18n.t("全　部")} />
                        <TabPane key="3" tab={i18n.t("审核中")} />
                    </Tabs>
                    <table className="table table-striped">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>{i18n.t("用户名")}</th>
                                <th>{i18n.t("邮箱")}</th>
                                <th>{i18n.t("社交账号")}</th>
                                <th>{i18n.t("用户组")}</th>
                                <th>{i18n.t("有效")}</th>
                                <th>{i18n.t("文章数")}</th>
                                <th>{i18n.t("评论数")}</th>
                                <th>{i18n.t("注册时间")}</th>
                                <th>{i18n.t("最后登录时间")}</th>
                                <th>{i18n.t("操作")}</th>
                            </tr>
                        </thead>
                        <tbody>{legacy.getUserList()}</tbody>
                    </table>
                    <Pagination
                        current={legacy.userStore.page}
                        total={legacy.userStore.total}
                        pageSize={legacy.userStore.pageSize}
                        showSizeChanger
                        pageSizeOptions={[10, 20, 50, 100]}
                        style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}
                        onChange={(page, pageSize) => legacy.userStore.getUserList(
                            undefined,
                            pageSize !== legacy.userStore.pageSize ? 1 : page,
                            undefined,
                            pageSize,
                        )}
                    />
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
