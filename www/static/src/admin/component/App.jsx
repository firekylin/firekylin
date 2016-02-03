import React from 'react';
import Base from '../../common/component/base';
import Login from './login';
import Sidebar from './sidebar';
import BreadCrumb from './breadcrumb';


export default class App extends Base {
  state = {
    routes: [
      {url: '/dashboard', icon: 'home', title:'概述'},
      {url: 'post', icon: 'setting', title: '文章管理', children: [
        {url: 'post/list', title: '文章列表'},
        {url: 'post/new', title: '添加文章'}
      ]},
      {url: '/page', icon: 'reply', title: '页面管理', children: [
        {url: '/page/list', title: '页面列表'},
        {url: '/page/new', title: '添加页面'},
        {url: '/page/topic', title: '话题管理'}
      ]},
      {url: '/user', icon: 'user', title: '用户管理', children: [
        {url: '/category/list', title: '分类'},
        {url: '/category/user', title: '用户组'},
        {url: '/category/invites', title: '批量邀请'}
      ]},
      {url: '/tag', icon: 'report', title: '标签管理', children: [
        {url: '/tag/list', title: '内容审核'},
        {url: '/tag/verify', title: '认证审核'}
      ]}
    ]
  };

  render() {
    if(!SysConfig.userInfo.username){
      return <Login />;
    }
    return (
      <div className="fk">
        <Sidebar />
        <div className="fk-content-wrap">
          <BreadCrumb />
          <div className="row">
            {this.props.children}
          </div>
        </div>
      </div>
    );
  }
}
