import React from 'react';
import autobind from 'autobind-decorator';

import BaseComponent from './BaseComponent';
import SystemActions from '../actions/SystemActions';
import { SystemStore } from '../stores/SystemStores';


@autobind
class DashBoardPage extends BaseComponent {

  componentDidMount() {
    SystemActions.load();

    this.subscribe(
        SystemStore.listen(this.onChange)
    );
  }

  render() {
    return (
      <div className="DashBoardPage page">
        <div className="title">
          <h2>仪表盘</h2>
        </div>

        <div className="block">
          <div className="title">
            <h3>系统概况</h3>
          </div>
          <div className="content">
            <p><label>服务器系统</label>{ this.state.platform }</p>
            <p><label>Node.js版本</label>{ this.state.nodeVersion }</p>
            <p><label>V8引擎版本</label>{ this.state.v8Version }</p>
            <p><label>MySQL版本</label>{ this.state.mysqlVersion }</p>
            <p><label>ThinkJS版本</label>{ this.state.thinkjsVersion }</p>
            <p><label>FireKylin版本</label>{ this.state.firekylinVersion }</p>
          </div>
        </div>

        <div className="block">
          <div className="title">
            <h3>关于我们</h3>
          </div>
          <div className="content">
            <p><label>项目主页</label><a href="http://firekylin.org/" target="_blank">http://firekylin.org/</a></p>
            <p><label>项目源码</label><a href="https://github.com/welefen/firekylin">https://github.com/welefen/firekylin</a></p>
            <p><label>问题反馈</label><a href="https://github.com/welefen/firekylin/issues">https://github.com/welefen/firekylin/issues</a></p>
            <p><label>团队博客</label><a href="http://www.75team.com/">http://www.75team.com/</a></p>
            <p><label>开发成员</label><a href="https://github.com/jedmeng">Jedmeng</a>、<a href="https://github.com/welefen">Welefen</a></p>
          </div>
        </div>
      </div>
    )
  }

  onChange(data) {
    this.setState(data);
  }
}

export default DashBoardPage;