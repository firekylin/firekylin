import React from 'react';
import Base from 'base';
import {Link} from 'react-router';
import classnames from 'classnames';
import {Pagination, Col} from 'react-bootstrap';

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
      total: 0,
      loading: true,
      postList: [],
      page: this.props.location.query.page/1 || 1
    }
  }
  componentDidMount(){
    this.listenTo(PostStore, this.handleTrigger.bind(this));
    PostAction.selectList(this.state.page);
  }
  handleTrigger(data, type){
    switch(type){
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
  getPostList(){
    if(this.state.loading){
      return (<tr><td colSpan="8" className="center">加载中。。。</td></tr>);
    }
    if(!this.state.postList.length){
      return (<tr><td colSpan="8" className="center">暂无文章</td></tr>);
    }
    return this.state.postList.map(item => {
      return (
        <tr key={item.id}>
          <td>
            <Link to={`/post/edit/${item.id}`} title={item.title}>{item.title}</Link>
          </td>
          <td>{item.user.display_name || item.user.name}</td>
          <td>{this.renderStatus(item.status)}</td>
          <td>{firekylin.formatTime(item.create_time)}</td>
          <td>{firekylin.formatTime(item.update_time)}</td>
          <td>
            <Link to={`/post/edit/${item.id}`} title={item.title}>
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
                    PostAction.delete.bind(PostAction, item.id),
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
            {this.state.postList.length ? <Pagination
                prev
                next
                first
                last
                ellipsis
                boundaryLinks
                maxButton={5}
                items={this.state.total}
                activePage={this.state.page}
                onSelect={(e, selectEvent) => this.setState({page: selectEvent.eventKey}, ()=> PostAction.selectList(this.state.page))}
            />
            : ''}
          </div>
        </div>
      </div>
    )
  }
}
