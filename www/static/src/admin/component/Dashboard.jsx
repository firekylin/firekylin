import React from 'react';
import Base from 'base';
import {Link} from 'react-router';
import BreadCrumb from 'admin/component/breadcrumb';
import moment from 'moment';

import PostAction from 'admin/action/post';
import PostStore from 'admin/store/post';
import SystemAction from 'admin/action/system';
import SystemStore from 'admin/store/system';

export default class extends Base {
  state = {
    platform: 'Linux',
    nodeVersion: '4.2',
    v8Version: '1.1',
    mysqlVersion: 'xxx',
    thinkjsVersion: '2.1',
    firekylinVersion: '2.0',
    posts: [],
    count: {
      posts: 0,
      comments: 0,
      cates: 0
    }
  };

  componentWillMount() {
    this.listenTo(PostStore, posts => this.setState({posts}));
    this.listenTo(SystemStore, data => {
      this.setState(Object.assign({}, data.versions, {count: data.count}));
    });
    PostAction.selectLastest();
    SystemAction.select();
  }

  render() {
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <h3 style={{marginBottom: '30px'}}>网站概要</h3>
          <p>目前有 {this.state.count.posts} 篇文章, 并有 {this.state.count.comments} 条关于你的评论在 {this.state.count.cates} 个分类中. </p>
          <p>点击下面的链接快速开始:</p>
          <div className="">
            <Link to="/post/create">撰写新文章</Link>
            <Link to="/options/general" style={{marginLeft: 20}}>系统设置</Link>
          </div>
          <hr />
          <div className="row">
            <div className="col-md-5">
              <h4>最近发布的文章</h4>
              <ul>
                {this.state.posts.map(post =>
                  <li key={post.id}>
                    <label>{moment(new Date(post.create_time)).format('MM.DD')}：</label>
                    <a href={`/post/${post.pathname}`} target="_blank">{post.title}</a>
                  </li>
                )}
              </ul>
            </div>
            <div className="col-md-3">
              <h4>系统概况</h4>
              <ul>
                <li><label>服务器系统：</label>{this.state.platform}</li>
                <li><label>Node.js版本：</label>{this.state.nodeVersion}</li>
                <li><label>V8引擎版本：</label>{this.state.v8Version}</li>
                <li><label>MySQL版本：</label>{this.state.mysqlVersion}</li>
                <li><label>ThinkJS版本：</label>{this.state.thinkjsVersion}</li>
                <li><label>FireKylin版本：</label>{this.state.firekylinVersion}</li>
              </ul>
            </div>
            <div className="col-md-4">
              <h4>关于我们</h4>
              <ul>
                <li>
                  <label>项目主页：</label>
                  <a href="http://firekylin.org/" target="_blank">http://firekylin.org/</a>
                </li>
                <li>
                  <label>项目源码：</label>
                  <a href="https://github.com/welefen/firekylin">https://github.com/welefen/firekylin</a>
                </li>
                <li>
                  <label>问题反馈：</label>
                  <a href="https://github.com/welefen/firekylin/issues">https://github.com/welefen/firekylin/issues</a>
                </li>
                <li>
                  <label>团队博客：</label>
                  <a href="http://www.75team.com/">http://www.75team.com/</a>
                </li>
                <li>
                  <label>开发成员：</label>
                  <a href="https://github.com/welefen">welefen</a>、<a href="https://github.com/lizheming">lizheming</a>、<a href="https://github.com/songguangyu">songguangyu</a>、<a href="https://github.com/showzyl">showzyl</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
