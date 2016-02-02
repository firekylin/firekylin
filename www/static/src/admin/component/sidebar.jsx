import React from 'react';
import Base from '../../common/component/base';

export default class extends Base {
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
  render(){
    return (
      <div className="fk-side ps-container" id="fk-side">
        <div className="mod">
          <div className="mod-logo">
            <h1><a href="Firekylin">Firekylin</a></h1>
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
    );
  }
}