import React from 'react';
import TagAction from 'admin/action/tag';
import TagStore from 'admin/store/tag';
import TipAction from 'common/action/tip';

import Base from 'base';
import {Link} from 'react-router';
import classnames from 'classnames';
import ModalAction from 'common/action/modal';
import BreadCrumb from 'admin/component/breadcrumb';

export default class extends Base {
  constructor(props){
    super(props);
    this.state = {
      loading: true,
      tagList: []
    }
  }
  componentDidMount(){
    this.listenTo(TagStore, this.handleTrigger.bind(this));
    TagAction.select();
  }

  handleTrigger(data, type){
    switch(type){
      case 'deleteTagFail':
        TipAction.fail(data);
        break;
      case 'deleteTagSuccess':
        TipAction.success('删除成功');
        this.setState({loading: true}, TagAction.select);
        break;
      case 'getTagList':
        this.setState({tagList: data, loading: false});
        break;
    }
  }

  getTagList(){
    if(this.state.loading){
      return (<tr><td colSpan="8" className="center">加载中。。。</td></tr>);
    }
    if(!this.state.tagList.length){
      return (<tr><td colSpan="8" className="center">暂无标签</td></tr>);
    }
    return this.state.tagList.map(item => {
      return (
        <tr key={item.id}>
          <td>{item.name}</td>
          <td>{item.pathname}</td>
          <td>{item.post_tag.length}</td>
          <td>
            <Link to={`/tag/edit/${item.id}`} title={item.name}>
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
                    TagAction.delete.bind(TagAction, item.id),
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
  render(){
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>名称</th>
                <th>缩略名</th>
                <th>文章数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {this.getTagList()}
            </tbody>
          </table>
        </div>
      </div>
    )
  }
}
