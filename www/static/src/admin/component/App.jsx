import React from 'react';

export default class App extends React.Component {
  state = {
    routes: [
      {url: '/admin', icon: 'home', title:'概述'},
      {url: '/post', icon: 'setting', title: '文章管理', children: [
        {url: '/post/list', title: '文章列表'},
        {url: '/post/new', title: '添加文章'}
      ]},
      {url: '/page', icon: 'reply', title: '页面管理', children: [
        {url: '/page/list', title: '页面列表'},
        {url: '/page/new', title: '添加页面'},
        {url: '/page/topic', title: '话题管理'}
      ]},
      {url: '/category', icon: 'user', title: '分类管理', children: [
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
    return (
      <div className="fk">
        <div className="fk-side ps-container" id="fk-side">
          <div className="mod">
            <div className="mod-logo">
              <h1>Firekylin</h1>
            </div>
          </div>
          {
            // <div className="mod-message">
            //   <div className="message">
            //   </div>
            // </div>
          }
          <ul className="mod-bar" style={{marginTop: 10}}>
            <input type="hidden" id="hide_values" val="0" />
            {this.state.routes.map( (route, i) =>
              <li key={i}>
                <a href={route.children ? 'javascript:void()' : route.url} className={`icon icon-${route.icon}`}>
                  <span>{route.title}</span>
                </a>
                {route.children ?
                  <ul className="hide">
                    {route.children.map( (child, j) =>
                      <li key={j}>
                        <a href={child.url}><span>{child.title}</span></a>
                      </li>
                    )}
                  </ul>
                : null}
              </li>
            )}
          </ul>
        </div>
        <div className="fk-content-wrap">
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
          <div className="row">
            {this.props.children}
          </div>
        </div>
      </div>
    );
  }
}
