import Base from 'base';
import React from 'react';
import moment from 'moment';
import ReactDOM from 'react-dom';
import {Link} from 'react-router';
import BreadCrumb from 'admin/component/breadcrumb';

import PostStore from 'admin/store/post';
import PostAction from 'admin/action/post';
import SystemStore from 'admin/store/system';
import ModalAction from 'common/action/modal';
import SystemAction from 'admin/action/system';

const UPDATE_STEPS = [
  [1, '正在下载 Firekylin 最新版本...', 'Firekylin 下载成功！'],
  [2, '正在解压更新文件...', '文件更新成功！'],
  [3, '正在重新安装依赖...', '依赖安装成功！'],
  [4, '正在重启程序...', '程序重启成功，将在 %d 秒后刷新页面！']
];
const COUNT_DOWN = 3;

module.exports = class extends Base {
  state = {
    platform: '',
    nodeVersion: '',
    v8Version: '',
    mysqlVersion: '',
    thinkjsVersion: '',
    firekylinVersion: '',
    posts: [],
    count: {
      posts: 0,
      comments: 0,
      cates: 0
    },
    step: 1,
    downCount: COUNT_DOWN
  };

  componentWillMount() {
    this.listenTo(PostStore, posts => this.setState({posts}));
    this.listenTo(SystemStore, this.handleTrigger.bind(this));
    PostAction.selectLastest();
    SystemAction.select();
  }

  handleTrigger(data, type) {
    switch(type) {
      case 'updateSystem':
        if( this.state.step <= UPDATE_STEPS.length ) {
          this.setState({step: this.state.step + 1}, () => SystemAction.updateSystem(this.state.step));
        }
        if( this.state.step > UPDATE_STEPS.length ) {
          setTimeout(location.reload.bind(location), COUNT_DOWN * 1000);
          setInterval(() => this.setState({downCount: Math.max(0, --this.state.downCount)}), 1000);
        }
        break;

      case 'getSystemInfo':
        this.setState(Object.assign({}, data.versions, {count: data.count}));
        break;
    }
  }

  renderUpdateConfirm() {
    ModalAction.confirm(
      '在线更新警告!',
      <div>在线更新会覆盖文件，请确认你已经备份好对程序的修改，如果没有修改请忽略该警告。</div>,
      ()=> {
        this.setState({showUpdate: true});
        SystemAction.updateSystem(this.state.step);
      }
    );
  }

  renderUpdate() {
    return (
    <div className="modal fade in" style={{display: this.state.showUpdate ? 'block' : 'none'}}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">×</span>
            </button>
            <h4 className="modal-title" >在线更新</h4>
          </div>
          <div className="modal-body" >
            <div className="dialog-panel anim-modal " >
              <a href="###" className="close-btn" ></a>
              <div className="dialog-content" >
                <ul className="update-step">
                  {UPDATE_STEPS.map(step =>
                    <li key={step[0]} className={this.state.step >= step[0] ? 'show' : null}>
                      <i className={this.state.step > step[0] ? 'success' : null}>{step[0]}</i>
                      <div className="pipe">
                        <div className="half"></div>
                      </div>
                      <span className="loading">{step[1]}</span>
                      <span className="ok">{step[2].replace('%d', this.state.downCount)}</span>
                    </li>  
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  }

  render() {
    let links = [
      {url: '/post/create', title: '撰写新文章', type: 2},
      {url: '/page/create', title: '创建页面', type: 1},
      {url: '/appearance/theme', title: '更改外观', type: 1},
      {url: '/options/general', title: '系统设置', type: 1}
    ].filter(link => link.type >= SysConfig.userInfo.type);

    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          {this.state.needUpdate ?
            <p className="bg-info update-message">
              Firekylin <a href={`https://github.com/firekylin/firekylin/blob/master/CHANGELOG.md#${this.state.needUpdate.replace(/\./g, '')}`}>{this.state.needUpdate}</a> 已经发布，请立即 <a href="http://firekylin.org/release/latest.tar.gz">下载更新</a> 或者使用 <a href="javascript:void(0)" onClick={this.renderUpdateConfirm.bind(this)}>在线更新</a>！
            </p>
          : null}
          <h3 style={{marginBottom: '30px'}}>网站概要</h3>
          <p>目前有 {this.state.count.posts} 篇文章, 并有 {this.state.count.comments} 条关于你的评论在 {this.state.count.cates} 个分类中. </p>
          <p>点击下面的链接快速开始:</p>
          <div className="quick-link">
            {links.map(link => <Link key={link.url} to={link.url}>{link.title}</Link>)}
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
                  <a href="https://firekylin.org/" target="_blank">http://firekylin.org/</a>
                </li>
                <li>
                  <label>项目源码：</label>
                  <a href="https://github.com/firekylin/firekylin">https://github.com/firekylin/firekylin</a>
                </li>
                <li>
                  <label>帮助文档：</label>
                  <a href="https://github.com/firekylin/firekylin/wiki" target="_blank">https://github.com/firekylin/firekylin/wiki</a>
                </li>
                <li>
                  <label>问题反馈：</label>
                  <a href="https://github.com/firekylin/firekylin/issues">https://github.com/firekylin/firekylin/issues</a>
                </li>
                <li>
                  <label>团队博客：</label>
                  <a href="https://www.75team.com/">http://www.75team.com/</a>
                </li>
                <li>
                  <label>开发成员：</label>
                  <a href="https://github.com/welefen">welefen</a>、<a href="https://github.com/lizheming">lizheming</a>、<a href="https://github.com/songguangyu">songguangyu</a>、<a href="https://github.com/showzyl">showzyl</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        {this.renderUpdate()}
      </div>
    );
  }
}
