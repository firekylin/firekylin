import React from 'react';
import {Link} from 'react-router';

import Base from 'base';
import BreadCrumb from 'admin/component/breadcrumb';
import ModalAction from 'common/action/modal';
import TipAction from 'common/action/tip';
import PageAction from 'admin/action/page';
import PageStore from 'admin/store/page';

import firekylin from 'common/util/firekylin';

module.exports = class extends Base {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      pageList: [],
      page: this.props.location.query.page || 1
    }
  }
  componentDidMount() {
    this.listenTo(PageStore, this.handleTrigger.bind(this));
    PageAction.selectList(this.state.page);
  }
  handleTrigger(data, type) {
    switch(type) {
      case 'deletePageFail':
        TipAction.fail(data);
        break;
      case 'deletePageSuccess':
        TipAction.success('删除成功');
        this.setState({loading: true}, ()=> PageAction.selectList(this.state.page));
        break;
      case 'getPageList':
        this.setState({pageList: data, loading: false});
        break;
    }
  }
  getPageList() {
    if(this.state.loading) {
      return (<tr><td colSpan="8" className="center">加载中……</td></tr>);
    }
    if(!this.state.pageList.length) {
      return (<tr><td colSpan="8" className="center">暂无页面</td></tr>);
    }
    return this.state.pageList.map(item => {
      return (
        <tr key={item.id}>
          <td>
            <Link to={`/page/edit/${item.id}`} title={item.title}>{item.title}</Link>
            {item.status !== 3 ? null : <a href={`/page/${item.pathname}.html`} target="_blank"><span className="glyphicon glyphicon-link" style={{fontSize: 12, marginLeft: 5, color: '#AAA'}} /></a>}
          </td>
          <td>{item.user ? item.user.display_name || item.user.name : null}</td>
          <td>{this.renderStatus(item.status)}</td>
          <td>{firekylin.formatTime(item.create_time)}</td>
          <td>{firekylin.formatTime(item.update_time)}</td>
          <td>
            <Link to={`/page/edit/${item.id}`} title={item.title}>
              <button type="button" className="btn btn-primary btn-xs">
                <span className="glyphicon glyphicon-edit"></span>
                编辑
              </button>
            </Link>
            <span> </span>
            <button
                type="button"
                className="btn btn-danger btn-xs"
                onClick={()=>
                  ModalAction.confirm(
                    '提示',
                    <div className="center">确定删除吗？</div>,
                    PageAction.delete.bind(PageAction, item.id),
                    'modal-sm'
                  )
                }
            >
              <span className="glyphicon glyphicon-remove"></span>
              删除
            </button>
          </td>
        </tr>
      );
    })
  }
  renderStatus(status) {
    let text = '';
    switch(status) {
      case 0: text = '草稿'; break;
      case 1: text = '待审核'; break;
      case 2: text = '已拒绝'; break;
      case 3: text = '已发布'; break;
    }
    if(status !== '') {
      return <em className="status">{text}</em>;
    }
    return null;
  }
  render() {
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>标题</th>
                <th>作者</th>
                <th>状态</th>
                <th>创建日期</th>
                <th>修改日期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {this.getPageList()}
            </tbody>
          </table>
          </div>
      </div>
    )
  }
}
