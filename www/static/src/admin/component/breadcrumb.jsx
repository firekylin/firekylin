import ReactDom from 'react-dom';
import React from 'react';
import Base from 'base';
import classnames from 'classnames';
import Sidebar from './sidebar';
import {Link} from 'react-router';

export default class extends Base {

  constructor(props){
    super(props);
    this.state = {
      userOpen: false,
      crumb: []
    }
    this.bindHandleDocumentClick = this.handleDocumentClick.bind(this);

    this.crumbs = {};
    (new Sidebar).state.routes.forEach(route => {
      //console.log(route);
      if( !route.children ) { return; }
      route.children.forEach( child => {
        this.crumbs[child.url] = [
          {title: route.title, url: route.url, children: route.children},
          child
        ];
      });
    });

    if( this.crumbs[this.props.location.pathname] ) {
      this.state.crumb = this.crumbs[this.props.location.pathname];
    }
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
    let breadcrumb;
    if( this.state.crumb.length > 0 ) {
      breadcrumb = (
        <ol className="breadcrumb">
          <li>
              <Link to="/dashboard">首页</Link>
          </li>
          {this.state.crumb.map( (item,i) => {
            if( item.url === this.props.location.pathname ) {
              return (
                <li key={i} className="active">{item.title}</li>
              );
            }
            return (
              <li key={i}>
                <Link to={item.children ? item.children[0].url :item.url}>{item.title}</Link>
              </li>
            );
          })}
        </ol>
      )
    }else{
      breadcrumb = (
        <ol className="breadcrumb">
          <li>首页</li>
        </ol>
      )
    }
    return (
      <div className="fk-header clearfix">
        <div className="pull-left">
          {breadcrumb}
        </div>
        <ul className="nav navbar-nav navbar-right userinfo" ref="userinfo">
          <li className={this.getUserClass()}>
            <a onClick={this.toggleUser.bind(this)} className="dropdown-toggle" data-toggle="dropdown">
              {SysConfig.userInfo.name} <b className="caret"></b>
            </a>
            <ul className="dropdown-menu">
              <li><Link to="/user/edit_pwd">修改密码</Link></li>
              <li><a href="/admin/user/logout">退出</a></li>
            </ul>
          </li>
        </ul>
      </div>
    );
  }
}
