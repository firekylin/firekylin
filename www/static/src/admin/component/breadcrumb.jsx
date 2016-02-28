import ReactDom from 'react-dom';
import React from 'react';
import Base from 'base';
import classnames from 'classnames';

export default class extends Base {

  constructor(){
    super();
    this.state = {
      userOpen: false
    }
    this.bindHandleDocumentClick = this.handleDocumentClick.bind(this);
  }

  componentDidMount(){
    document.addEventListener('click', this.bindHandleDocumentClick, false);
  }

  componentWillUnmount(){
    document.removeEventListener('click', this.bindHandleDocumentClick, false);
  }

  handleDocumentClick(event){
    if (!ReactDom.findDOMNode(this.refs.userinfo).contains(event.target)) {
      this.setState({
        userOpen: false
      });
    }
  }

  toggleUser(){
    this.setState({
      userOpen: !this.state.userOpen
    })
  }
  getUserClass(){
    return classnames({
      dropdown: true,
      open: this.state.userOpen
    })
  }
  render(){
    return (
      <div className="fk-header clearfix">
        <div className="pull-left">
          <ol className="breadcrumb">
            <li><a href="#">Home</a></li>
            <li><a href="#">Library</a></li>
            <li className="active">Data</li>
          </ol>
        </div>
        <ul className="nav navbar-nav navbar-right userinfo" ref="userinfo">
          <li className={this.getUserClass()}>
            <a onClick={this.toggleUser.bind(this)} className="dropdown-toggle" data-toggle="dropdown">
              {SysConfig.userInfo.name} <b className="caret"></b>
            </a>
            <ul className="dropdown-menu">
              <li><a href="">修改密码</a></li>
              <li><a href="/admin/user/logout">退出</a></li>
            </ul>
          </li>
        </ul>
      </div>
    );
  }
}
