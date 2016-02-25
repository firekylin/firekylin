import React from 'react';
import Base from '../../common/component/base';
import {Link} from 'react-router';
import classnames from 'classnames';

import PostAction from '../action/post';
import PostStore from '../store/post';

export default class extends Base {
  constructor(props){
    super(props);
    this.state = {
      loading: true,
      postList: [],
      page: this.props.location.query.page || 1
    }
  }
  componentDidMount(){
    this.listenTo(PostStore, this.handleTrigger.bind(this));
    PostAction.selectList(this.state.page);
  }
  handleTrigger(data, type){
    this.setState({postList: data, loading: false});
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
          <td>{item.title}</td>
          <td>{item.user.display_name}</td>
          <td>{item.cate.map(c => c.name).join()}</td>
          <td>{item.create_time}</td>
        </tr>
      );
    })
  }
  render(){
    return (
      <table className="table table-striped">
        <thead>
          <tr>
            <th>标题</th>
            <th>作者</th>
            <th>分类</th>
            <th>日期</th>
          </tr>
        </thead>
        <tbody>
          {this.getPostList()}
        </tbody>
      </table>
    )
  }
}
