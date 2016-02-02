import React from 'react';
import Base from '../../common/component/base';

export default class extends Base {
  render(){
    return (
      <div className="row">
        <div className="fk-header">
          <div className="mod-header-user">
            <div className="pull-left">
              <ol className="bradcrumb">
                <li>概况</li>
              </ol>
            </div>
            <ul className="pull-right">
              <li className="dropdown">
                <a href="#" className="dropdown-toggle mod-bell" data-toggle="dropdown">
                  <i className="icon icon-bell"></i>
                  <ul className="dropdown-menu mod-chat">
                    <p>没有通知</p>
                  </ul>
                </a>
              </li>
              <li className="dropdown username">
                <a href="" className="dropdown-toggle" data-toggle="dropdown">
                  admin
                  <span className="caret"></span>
                </a>
                <ul className="dropdown-menu pull-right mod-user">
                  <li><a href="#"><i className="icon icon-home">首页</i></a></li>
                  <li><a href="#"><i className="icon icon-ul">概述</i></a></li>
                  <li><a href="#"><i className="icon icon-logout">退出</i></a></li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
}