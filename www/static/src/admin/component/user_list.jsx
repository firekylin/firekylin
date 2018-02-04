import React from 'react';
import {Link} from 'react-router';
import {
  Tabs,
  Tab
} from 'react-bootstrap';

import UserAction from '../action/user';
import UserStore from '../store/user';
import ModalAction from '../../common/action/modal';
import Base from 'base';
import BreadCrumb from 'admin/component/breadcrumb';
import TipAction from 'common/action/tip';

module.exports = class extends Base {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      userList: [],
      key: 0
    }
  }
  componentDidMount() {
    this.listenTo(UserStore, this.handleTrigger.bind(this));
    UserAction.select();
  }
  handleTrigger(data, type) {
    switch(type) {
      case 'deleteUserSuccess':
        TipAction.success('删除成功');
        UserAction.select(null, this.state.key===3?'contributor':'');
        break;
      case 'deleteUserFail':
        break;
      default:
        this.setState({userList: data, loading: false});
    }
  }
  handleDelete(userId) {
    return ModalAction.confirm('提示', <div className="center">确定删除该用户吗？<br />
      <p className="gray">删除后无法恢复</p></div>, () => {
      UserAction.delete(userId);
    }, 'modal-sm');
  }
  handleSelect(type) {
    this.state.key = type;
    this.state.page = 1;
    return UserAction.select(null, type===3?'contributor':'');
  }
  pass(user) {
    UserAction.pass(user.id);
  }

  deny(user) {
    return ModalAction.confirm('提示', <div className="center">拒绝该用户的申请后会直接删除该账号<br />
      <p className="gray">删除后无法恢复</p></div>, () => {
      UserAction.delete(user.id);
    }, 'modal-sm');
  }

  getUserType(user) {
    switch(user.type) {
      case 1: return '管理员';
      case 2: return '编辑';
      case 3: return '投稿者';
    }
    return '';
  }

  getUserList() {
    if(this.state.loading) {
      return (<tr><td colSpan="10" className="center">加载中……</td></tr>);
    }
    if(!this.state.userList.length) {
      return (<tr><td colSpan="10" className="center">无相关用户</td></tr>);
    }
    return this.state.userList.map(item => {
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
            {!this.state.key ? <Link to={'user/edit/' + item.id}>
              <button type="button" className="btn btn-primary btn-xs">
                <span className="glyphicon glyphicon-edit" aria-hidden="true"></span> 编辑
              </button>
            </Link> :
            <button type="button" className="btn btn-success btn-xs" onClick={this.pass.bind(this, item)}>
              <span className="glyphicon glyphicon-ok"></span>
              通过
            </button>
            }
            &nbsp;
            {!this.state.key ? <button type="button" className="btn btn-danger btn-xs"
              onClick={this.handleDelete.bind(this, item.id)}>
              <span className="glyphicon glyphicon-trash" aria-hidden="true"></span> 删除
            </button> :
            <button type="button" className="btn btn-warning btn-xs" onClick={this.deny.bind(this, item)}>
              <span className="glyphicon glyphicon-remove"></span>
              拒绝
            </button>
            }
          </td>
        </tr>
      );
    })
  }
  render() {
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <Tabs activeKey={this.state.key} onSelect={this.handleSelect.bind(this)}>
            <Tab eventKey={0} title="全　部"></Tab>
            <Tab eventKey={3} title="审核中"></Tab>
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
