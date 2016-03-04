import React from 'react';
import Base from 'base';
import {Link} from 'react-router';
import classnames from 'classnames';
import {Pagination, Col} from 'react-bootstrap';

import ModalAction from 'common/action/modal';
import TipAction from 'common/action/tip';
import PostAction from '../action/post';
import PostStore from '../store/post';

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
            <a href={`/admin/post/edit/${item.id}`} title={item.title}>{item.title}</a>
            {this.renderStatus(item.status)}
          </td>
          <td>{item.user.display_name}</td>
          <td>{item.cate.map(c => c.name).join()}</td>
          <td>{item.create_time}</td>
          <td>
            <a href={`/admin/post/edit/${item.id}`} title={item.title}>
              <button type="button" className="btn btn-primary btn-xs">
                <span className="glyphicon glyphicon-edit"></span>
                编辑
              </button>
            </a>
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
    }
    if( status !== 3 ) {
      return <em className="status">{text}</em>;
    }
    return null;
  }
  render(){
    return (
      <div>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>标题</th>
              <th>作者</th>
              <th>分类</th>
              <th>日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {this.getPostList()}
          </tbody>
        </table>
        <div className="col-xs-12" style={{textAlign: 'center'}}>
          <Pagination
              prev
              next
              first
              last
              ellipsis
              boundaryLinks
              maxButton={5}
              bsSize="small"
              items={this.state.total}
              activePage={this.state.page}
              onSelect={(e, selectEvent) => this.setState({page: selectEvent.eventKey}, ()=> PostAction.selectList(this.state.page))}
          />
        </div>
      </div>
    )
  }
}
