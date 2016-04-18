import React from 'react';
import Base from 'base';
import {Link} from 'react-router';
import classnames from 'classnames';
import {
  Pagination,
  Col,
  Tabs,
  Tab
} from 'react-bootstrap';

import BreadCrumb from 'admin/component/breadcrumb';
import ModalAction from 'common/action/modal';
import TipAction from 'common/action/tip';
import PostAction from '../action/post';
import PostStore from '../store/post';

import firekylin from 'common/util/firekylin';

export default class extends Base {
  constructor(props){
    super(props);
    this.state = {
      key: 4,
      total: 0,
      loading: true,
      postList: [],
      keyword: '',
      page: this.props.location.query.page/1 || 1
    }
  }
  componentDidMount(){
    this.listenTo(PostStore, this.handleTrigger.bind(this));
    PostAction.selectList(this.state.page);
  }
  handleTrigger(data, type){
    switch(type){
      case 'savePostSuccess':
        TipAction.success('审核成功');
        this.setState({loading: true}, PostAction.selectList.bind(PostAction, this.state.page, this.state.key === 4 ? null : this.state.key));
        break;
      case 'savePostFail':
      case 'deletePostFail':
        TipAction.fail(data);
        break;
      case 'deletePostSuccess':
        TipAction.success('删除成功');
        this.setState({loading: true}, ()=> PostAction.selectList(this.state.page));
        break;
      case 'getPostList':
        this.setState({postList: data.data, total: data.totalPages, loading: false});
        break;
    }
  }
  handleSelect(key) {
    this.state.key = key;
    this.state.page = 1;
    this.state.keyword = '';

    return PostAction.selectList(this.state.page, key !== 4 ? key : null, this.state.keyword);
  }

  handleSearch() {
    PostAction.selectList(this.state.page, this.state.key !== 4 ? this.state.key : null, this.state.keyword);
  }

  getPostList(){
    if(this.state.loading){
      return (<tr><td colSpan="8" className="center">加载中……</td></tr>);
    }
    if(!this.state.postList.length){
      return (<tr><td colSpan="8" className="center">暂无文章</td></tr>);
    }
    return this.state.postList.map(item => {
      return (
        <tr key={item.id}>
          <td>
            <Link to={`/post/edit/${item.id}`} title={item.title}>{item.title}</Link>
            {item.status !== 3 ? null : <a href={`/post/${item.pathname}.html`} target="_blank"><span className="glyphicon glyphicon-link" style={{fontSize: 12, marginLeft: 5, color: '#AAA'}} /></a>}
          </td>
          <td>{item.user.display_name || item.user.name}</td>
          <td>{this.renderStatus(item.status)}</td>
          <td>{!item.create_time || item.create_time == '0000-00-00 00:00:00' ? '' : firekylin.formatTime(item.create_time)}</td>
          <td>{firekylin.formatTime(item.update_time)}</td>
          {this.renderBtns(item)}
        </tr>
      );
    })
  }
  renderBtns(post) {
    //管理员在审核和拒绝tab上显示更多按钮
    let isAdmin = SysConfig.userInfo.type === 1;
    let showPassAndDeny = isAdmin && [1,2,3].includes(this.state.key);
    let showEditAndDel = !isAdmin || this.state.key===4;
    return (
      <td>
        {showPassAndDeny ?
        <button
            type="button"
            className="btn btn-success btn-xs"
            disabled={[0,3].includes(post.status)}
            onClick={PostAction.pass.bind(PostAction, post.id)}
        >
          <span className="glyphicon glyphicon-ok"></span>
          通过
        </button> : null}
        {showPassAndDeny ? <span> </span> : null}
        {showPassAndDeny ?
        <button
            type="button"
            className="btn btn-warning btn-xs"
            disabled={[0,2].includes(post.status)}
            onClick={PostAction.deny.bind(PostAction, post.id)}
        >
          <span className="glyphicon glyphicon-remove"></span>
          拒绝
        </button> : null}
        {showPassAndDeny ? <span> </span> : null}
        {showEditAndDel ? <Link to={`/post/edit/${post.id}`} title={post.title}>
          <button type="button" className="btn btn-primary btn-xs">
            <span className="glyphicon glyphicon-edit"></span>
            编辑
          </button>
        </Link> : null}
        {showEditAndDel ? <span> </span> : null}
        {showEditAndDel ? <button
            type="button"
            className="btn btn-danger btn-xs"
            onClick={()=>
              ModalAction.confirm(
                '提示',
                <div className="center">确定删除吗？</div>,
                PostAction.delete.bind(PostAction, post.id),
                'modal-sm'
              )
            }
        >
          <span className="glyphicon glyphicon-trash"></span>
          删除
        </button> : null}
      </td>
    );
  }
  renderStatus(status) {
    let text = '';
    switch(status) {
      case 0: text = '草稿'; break;
      case 1: text = '待审核'; break;
      case 2: text = '已拒绝'; break;
      case 3: text = '已发布'; break;
    }
    if( status !== '' ) {
      return <em className="status">{text}</em>;
    }
    return null;
  }

  render(){
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props}/>
        <div className="manage-container">
        <div className="fk-search">
            <input
                type="text"
                className="fk-search-input"
                placeholder="请输入关键字"
                value={this.state.keyword}
                onChange={e=> this.setState({keyword: e.target.value})}
                onKeyDown={e=> e.keyCode === 13 && this.handleSearch()}
            />
            <i className="fk-search-btn icon-search" onClick={this.handleSearch.bind(this)}></i>
        </div>
          <Tabs activeKey={this.state.key} onSelect={this.handleSelect.bind(this)}>
            <Tab eventKey={4} title="全　部"></Tab>
            <Tab eventKey={3} title="已发布"></Tab>
            <Tab eventKey={1} title="审核中"></Tab>
            <Tab eventKey={2} title="已拒绝"></Tab>
          </Tabs>
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
              {this.getPostList()}
            </tbody>
          </table>
          <div className="col-xs-12" style={{textAlign: 'center'}}>
            {this.state.total > 1 ? <Pagination
                prev
                next
                first
                last
                ellipsis
                boundaryLinks
                maxButton={5}
                items={this.state.total}
                activePage={this.state.page}
                onSelect={(e, selectEvent) =>
                  this.setState({page: selectEvent.eventKey}, ()=>
                    PostAction.selectList(this.state.page, this.state.key === 4 ? null : this.state.key)
                  )
                }
            />
            : ''}
          </div>
        </div>
      </div>
    )
  }
}
