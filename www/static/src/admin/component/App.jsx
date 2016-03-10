import React from 'react';
import Base from 'base';
import Login from './login';
import Sidebar from './sidebar';
import BreadCrumb from './breadcrumb';
import Tip from 'common/component/tip';
import ModalManage from 'common/component/modal_manage';


export default class App extends Base {
  state = {

  };

  render() {
    if(!SysConfig.userInfo.name){
      return (
      <div className="fk">
        <Tip />
        <Login />
      </div>);
    }
    return (
      <div className="fk">
        <Sidebar />
        <Tip />
        {this.props.children}
        <ModalManage />
      </div>
    );
  }
}
