import React from 'react';
import Base from '../../common/component/base';
import Login from './login';
import Sidebar from './sidebar';
import BreadCrumb from './breadcrumb';
import Tip from '../../common/component/tip';


export default class App extends Base {
  state = {
    
  };

  render() {
    if(!SysConfig.userInfo.username){
      return <Login />;
    }
    return (
      <div className="fk">
        <Sidebar />
        <div className="fk-content-wrap">
          <Tip />
          <BreadCrumb />
          <div className="manage-container">
            {this.props.children}
          </div>
        </div>
      </div>
    );
  }
}
