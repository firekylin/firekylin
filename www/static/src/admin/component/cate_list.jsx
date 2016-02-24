import React from 'react';
import Base from '../../common/component/base';
import {Link} from 'react-router';
import classnames from 'classnames';

import CateAction from '../action/cate';
import CateStore from '../store/cate';

export default class extends Base {
  constructor(props){
    super(props);
    this.state = {
      loading: true,
      cateList: []
    }
  }
  componentDidMount(){
    this.listenTo(CateStore, this.handleTrigger.bind(this));
    CateAction.select();
  }
  handleTrigger(data, type){
    this.setState({cateList: data, loading: false});
  }
  getCateList(){
    if(this.state.loading){
      return (<tr><td colSpan="8" className="center">加载中。。。</td></tr>);
    }
    if(!this.state.cateList.length){
      return (<tr><td colSpan="8" className="center">暂无分类</td></tr>);
    }
    return this.state.cateList.map(item => {
      return (
        <tr key={item.id}>
          <td>{item.name}</td>
          <td>{item.pathname}</td>
          <td>{item.post_cate.length}</td>
        </tr>
      );
    })
  }
  render(){
    return (
      <table className="table table-striped">
        <thead>
          <tr>
            <th>名称</th>
            <th>缩略名</th>
            <th>文章数</th>
          </tr>
        </thead>
        <tbody>
          {this.getCateList()}
        </tbody>
      </table>
    )
  }
}
