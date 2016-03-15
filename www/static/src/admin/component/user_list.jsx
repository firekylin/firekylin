import React from 'react';
import Base from 'base';
import {Link} from 'react-router';
import classnames from 'classnames';

import BreadCrumb from 'admin/component/breadcrumb';
import UserAction from '../action/user';
import UserStore from '../store/user';

import TipAction from 'common/action/tip';

import ModalAction from '../../common/action/modal';

export default class extends Base {
  constructor(props){
    super(props);
    this.state = {
      loading: true,
      userList: []
    }
  }
  componentDidMount(){
    this.listenTo(UserStore, this.handleTrigger.bind(this));
    UserAction.select();
  }
  handleTrigger(data, type){
    switch(type){
      case 'deleteUserSuccess':
        TipAction.success('删除成功');
        UserAction.select();
        break;
      default: 
        this.setState({userList: data, loading: false});
    }
  }
  handleDelete(userId){
    return ModalAction.confirm('提示', <div className="center">确定删除该用户吗？<br /><p className="gray">删除后无法恢复</p></div>, () => {
      UserAction.delete(userId);
    }, 'modal-sm');
  }
  getUserList(){
    if(this.state.loading){
      return (<tr><td colSpan="8" className="center">加载中。。。</td></tr>);
    }
    if(!this.state.userList.length){
      return (<tr><td colSpan="8" className="center">无相关用户</td></tr>);
    }
    return this.state.userList.map(item => {
      return (
        <tr key={item.id}>
          <td scope="row">{item.id}</td>
          <td>{item.display_name || item.name}</td>
          <td>{item.email}</td>
          <td>{item.type == 1 ? '管理员' : '编辑'}</td>
          <td>{item.status == 1 ? <span className="label label-success">有效</span> : <span className="label label-warning">禁用</span>}</td>
          <td>{item.create_time}</td>
          <td>{item.last_login_time}</td>
          <td>
            <Link to={'user/edit/' + item.id}>
              <button type="button" className="btn btn-primary btn-xs">
                <span className="glyphicon glyphicon-edit" aria-hidden="true"></span> 编辑
              </button>
            </Link>&nbsp;
            <button type="button" className="btn btn-danger btn-xs" onClick={this.handleDelete.bind(this, item.id)}>
              <span className="glyphicon glyphicon-remove" aria-hidden="true"></span> 删除
            </button>
          </td>
        </tr>
      );
    })
  }
  render(){
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户名</th>
                <th>邮箱</th>
                <th>用户组</th>
                <th>有效</th>
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
