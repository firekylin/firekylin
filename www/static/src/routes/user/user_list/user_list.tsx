import * as React from 'react';
import { Link } from 'react-router-dom';
import { Tabs } from 'antd';
import { observer, inject } from 'mobx-react';
import { UserProps } from '../user.model';
import { message, Modal } from 'antd';
import BreadCrumb from '../../../components/breadcrumb';

@inject('userStore')
@observer
export default class extends React.Component<UserProps, any> {

    public userStore: any;

    constructor(props: UserProps) {
        super(props);
        this.userStore = this.props.userStore;
        this.userStore.setKey('0');
    }
    componentDidMount() {
        this.userStore.getUserList();
    }
    pass(user: any) {
        this.userStore.passUser(user.id);
    }

    handleDelete(userId: any) {
        const that = this;
        return Modal.confirm({
            title: '确定删除该用户吗？',
            content: '删除后无法恢复',
            onOk()  {
                // message.success('删除成功');
                that.userStore.deleteUser(userId);
            },
        });
    }
    handleSelect(type: any) {
        this.userStore.setKey(type);
        return this.userStore.getUserList(type === '3' ? 'contributor' : '');
    }

    deny(user: any) {
        const that = this;
        return Modal.confirm({
            title: '拒绝该用户的申请后会直接删除该账号',
            content: '删除后无法恢复',
            onOk()  {
                that.userStore.deleteUser(user.id, () => {
                    message.success('删除成功');
                    that.userStore.getUserList(that.userStore.key === 3 ? 'contributor' : '' );
                },                        () => {
                    message.success('删除失败，请稍后重试');
                });
            },
        });
    }

    getUserType(user: any) {
        switch (user.type) {
            case 1: return '管理员';
            case 2: return '编辑';
            case 3: return '投稿者';
            default: return '';
        }
    }

    getUserList() {
        if (this.userStore.loading) {
            return (<tr><td className="center" colSpan="10">加载中……</td></tr>);
        }
        if (!this.userStore.userList.length) {
            return (<tr><td className="center" colSpan="10">无相关用户</td></tr>);
        }
        return this.userStore.userList.map(item => {
            return (
                <tr key={item.id}>
                    <td scope="row">{item.id}</td>
                    <td>{item.display_name || item.name}</td>
                    <td>{item.email}</td>
                    <td>{this.getUserType(item)}</td>
                    <td>
                        {item.status === 1 ?
                            <span className="label label-success">有效</span> :
                            <span className="label label-warning">禁用</span>}
                    </td>
                    <td>{item.post_num}</td>
                    <td>{item.comment_num}</td>
                    <td>{item.create_time}</td>
                    <td>{item.last_login_time}</td>
                    <td>
                        {this.userStore.key === '0'
                            ? <Link to={`/user/edit/${item.id}`}>
                                <button type="button" className="btn btn-primary btn-xs">
                                    <span className="glyphicon glyphicon-edit" aria-hidden="true" /> 编辑
                                </button>
                            </Link>
                            : <button type="button" className="btn btn-success btn-xs" onClick={this.pass.bind(this, item)}>
                                <span className="glyphicon glyphicon-ok" />
                                通过
                            </button>}
                        &nbsp;
                        {this.userStore.key === '0' ? <button type="button" className="btn btn-danger btn-xs"
                                                   onClick={this.handleDelete.bind(this, item.id)}>
                                <span className="glyphicon glyphicon-trash" aria-hidden="true" /> 删除
                            </button> :
                            <button type="button" className="btn btn-warning btn-xs" onClick={this.deny.bind(this, item)}>
                                <span className="glyphicon glyphicon-remove" />
                                拒绝
                            </button>
                        }
                    </td>
                </tr>
            );
        });
    }
    render() {
        const TabPane = Tabs.TabPane;
        return (
            <div className="fk-content-wrap">
                <BreadCrumb {...this.props} />
                <div className="manage-container">
                    <Tabs defaultActiveKey={this.props.userStore.key.toString()} onChange={type => this.handleSelect(type)}>
                        <TabPane key="0" tab="全　部" />
                        <TabPane key="3" tab="审核中" />
                    </Tabs>
                    <table className="table table-striped">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>用户名</th>
                            <th>邮箱</th>
                            <th>用户组</th>
                            <th>有效</th>
                            <th>文章数</th>
                            <th>评论数</th>
                            <th>注册时间</th>
                            <th>最后登录时间</th>
                            <th>操作</th>
                        </tr>
                        </thead>
                        <tbody>
                        {this.getUserList()}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
}
